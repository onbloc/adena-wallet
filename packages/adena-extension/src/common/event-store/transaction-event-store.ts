import axios from 'axios';
import { EventStore } from './event-store';
import { Event, EventStatus } from './types';
import { makeHexByBase64, parseABCIValue } from './utility';

type ResponseDataType = string[];

// Add Lock interface: Simple mutex implementation
interface Lock {
  acquire(): Promise<void>;
  release(): void;
}

// Simple mutex implementation class
class Mutex implements Lock {
  private _locked = false;
  private _waitingResolvers: Array<() => void> = [];

  public async acquire(): Promise<void> {
    if (!this._locked) {
      this._locked = true;
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this._waitingResolvers.push(resolve);
    });
  }

  public release(): void {
    if (!this._locked) {
      return;
    }

    if (this._waitingResolvers.length > 0) {
      const resolve = this._waitingResolvers.shift();
      if (resolve) {
        resolve();
      }
    } else {
      this._locked = false;
    }
  }
}

export class TransactionEventStore implements EventStore<ResponseDataType> {
  private events: Map<string, Event<ResponseDataType>>;
  private lock: Lock;

  constructor() {
    this.events = new Map();
    this.lock = new Mutex();
  }

  /**
   * Adds a new event to the store with the given ID, emit number, and callback.
   * The event is initially set to the 'PENDING' status.
   *
   * @param id - Unique identifier for the event.
   * @param chainId - Chain ID for the transaction.
   * @param rpcUrl - RPC URL for the chain.
   * @param onEmit - The function to be called when the event is emitted.
   * @returns The added event.
   */
  addEvent(
    id: string,
    chainId: string,
    rpcUrl: string,
    isDefaultNetwork: boolean,
    onEmit: (event: Event<ResponseDataType>) => Promise<void>,
  ): Event<ResponseDataType> {
    // Return synchronously but queue asynchronous operations internally
    this.lock.acquire().then(() => {
      try {
        // Ignore if already added
        if (this.events.has(id)) {
          return;
        }

        const event: Event<ResponseDataType> = {
          id,
          status: 'PENDING',
          emitNumber: null,
          chainId,
          rpcUrl,
          isDefaultNetwork,
          data: null,
          requests: 0,
          onEmit,
        };
        this.events.set(id, { ...event });
      } finally {
        this.lock.release();
      }
    });

    // Create event object to return immediately
    return {
      id,
      status: 'PENDING',
      emitNumber: null,
      chainId,
      rpcUrl,
      isDefaultNetwork,
      data: null,
      requests: 0,
      onEmit,
    };
  }

  /**
   * Retrieves an event by its ID.
   *
   * @param id - Unique identifier for the event.
   * @returns The event if found, otherwise null.
   */
  getEvent(id: string): Event<ResponseDataType> | null {
    return this.events.get(id) || null;
  }

  /**
   * Increment the request count for an event
   * @param id - Unique identifier for the event.
   */
  addEventRequestCount(id: string): void {
    this.lock.acquire().then(() => {
      try {
        const event = this.events.get(id);
        if (!event) {
          return;
        }

        event.requests += 1;
        this.events.set(id, { ...event });
      } finally {
        this.lock.release();
      }
    });
  }

  /**
   * Checks if an event with the given ID exists in the store.
   *
   * @param id - Unique identifier for the event.
   * @returns True if the event exists, otherwise false.
   */
  hasEvent(id: string): boolean {
    return this.events.has(id);
  }

  /**
   * Emits the event with the given ID. The event's callback is executed,
   * and the event is removed from the store.
   *
   * @param id - Unique identifier for the event.
   * @returns True if the event was successfully emitted, otherwise false.
   */
  async emitEvent(id: string): Promise<boolean> {
    let event: Event<ResponseDataType> | undefined;

    await this.lock.acquire();
    try {
      event = this.events.get(id);
      if (!event || event.status === 'PENDING') {
        return false;
      }

      this.events.delete(id);
    } finally {
      this.lock.release();
    }

    if (event) {
      try {
        await event.onEmit(event);
      } catch (error) {
        console.error(`Error executing callback for event ${id}:`, error);
      }
      return true;
    }

    return false;
  }

  /**
   * Emits all events that have an emit number set.
   * The callback of each matching event is executed.
   *
   * @returns An array of events that were successfully emitted.
   */
  async emitAllEvents(): Promise<Event<ResponseDataType>[]> {
    const eventsToEmit: string[] = [];
    const triggeredEvents: Event<ResponseDataType>[] = [];

    await this.lock.acquire();
    try {
      for (const [id, event] of this.events.entries()) {
        if (event.emitNumber !== null) {
          eventsToEmit.push(id);
        }
      }
    } finally {
      this.lock.release();
    }

    // Emit individual events after releasing the lock
    for (const id of eventsToEmit) {
      const success = await this.emitEvent(id);
      if (success) {
        const event = this.getEvent(id);
        if (event) {
          triggeredEvents.push(event);
        }
      }
    }

    return triggeredEvents;
  }

  /**
   * Updates all pending events by checking their transaction status
   *
   * @returns An array of events that were updated
   */
  async updatePendingEvents(): Promise<Event<ResponseDataType>[]> {
    let pendingEvents: Event<ResponseDataType>[] = [];

    await this.lock.acquire();
    try {
      pendingEvents = Array.from(this.events.values()).filter(
        (event) => event.status === 'PENDING',
      );
    } finally {
      this.lock.release();
    }

    const updatedEvents = await Promise.all(
      pendingEvents.map((event) =>
        this.getTransactionResult(event.id)
          .then<Event<ResponseDataType> | null>((result) => {
            if (!result) {
              return null;
            }

            const status = !result.hasError ? 'SUCCESS' : 'FAILED';
            return {
              ...event,
              status,
              emitNumber: result?.height || null,
              data: result?.data || null,
            };
          })
          .catch(() => null),
      ),
    );

    await this.lock.acquire();
    try {
      for (const updatedEvent of updatedEvents) {
        if (updatedEvent) {
          this.events.set(updatedEvent.id, { ...updatedEvent });
        }
      }
    } finally {
      this.lock.release();
    }

    return updatedEvents.filter((event) => event !== null) as Event<ResponseDataType>[];
  }

  /**
   * Removes an event by its ID from the store.
   *
   * @param id - Unique identifier for the event.
   * @returns The removed event if it existed, otherwise null.
   */
  removeEvent(id: string): Event<ResponseDataType> | null {
    const event = this.events.get(id);
    if (!event) return null;

    this.lock.acquire().then(() => {
      try {
        // If not deleted yet, delete it
        if (this.events.has(id)) {
          this.events.delete(id);
        }
      } finally {
        this.lock.release();
      }
    });

    return event;
  }

  /**
   * Removes all events from the store.
   */
  removeAllEvents(): void {
    this.lock.acquire().then(() => {
      try {
        this.events.clear();
      } finally {
        this.lock.release();
      }
    });
  }

  /**
   * Returns the total number of events currently stored.
   *
   * @returns The number of events in the store.
   */
  count(): number {
    return this.events.size;
  }

  /**
   * Returns an array of all event IDs currently in the store.
   *
   * @returns An array of event IDs.
   */
  list(): string[] {
    return Array.from(this.events.keys());
  }

  /**
   * Retrieves the current status of the event with the given ID.
   *
   * @param id - Unique identifier for the event.
   * @returns The status of the event if it exists, otherwise null.
   */
  getStatus(id: string): EventStatus | null {
    const event = this.events.get(id);
    return event ? event.status : null;
  }

  private async getTransactionResult(id: string): Promise<{
    height: number;
    hasError: boolean;
    data: ResponseDataType;
  } | null> {
    const event = this.getEvent(id);
    if (!event) {
      return null;
    }

    this.addEventRequestCount(id);

    try {
      const networkClient = axios.create({ baseURL: event.rpcUrl });
      const result = await networkClient.get('/tx?hash=' + makeHexByBase64(id));

      const height = Number(result.data?.result?.height || 0);
      if (!height) {
        if (event.requests >= 10) {
          return {
            height: 0,
            hasError: true,
            data: [],
          };
        }

        return null;
      }

      const response = result.data?.result?.tx_result?.ResponseBase;
      const hasError = !!response?.Error;
      if (hasError) {
        return {
          height,
          hasError,
          data: [],
        };
      }

      const responseData = response?.Data;
      if (!responseData) {
        return {
          height,
          hasError,
          data: [],
        };
      }

      return {
        height,
        hasError,
        data: parseABCIValue(responseData),
      };
    } catch (error) {
      console.error(`Error fetching transaction result for ${id}:`, error);
      return null;
    }
  }
}
