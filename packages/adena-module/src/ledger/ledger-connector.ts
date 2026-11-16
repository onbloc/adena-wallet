import { LedgerConnector as AminoLedgerConnector } from '@cosmjs/ledger-amino';
import Transport from '@ledgerhq/hw-transport';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';

export class AdenaLedgerConnector extends AminoLedgerConnector {
  /**
   * Ledger devices are reached through WebHID (or the older WebUSB), neither of
   * which Firefox implements. Every transport helper below therefore degrades to
   * a no-op when the browser exposes neither, instead of failing with
   * `navigator.usb is undefined` in the middle of a flow.
   */
  public static isSupported(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }
    const { hid, usb } = navigator as Navigator & { hid?: unknown; usb?: unknown };
    return !!hid || !!usb;
  }

  public static isSupportHID() {
    return TransportWebHID.isSupported();
  }

  public static fromTransport(transport: Transport) {
    return new AminoLedgerConnector(transport);
  }

  public static async createTransport(): Promise<Transport> {
    const interactiveTimeout = 120_000;
    const isHID = await AdenaLedgerConnector.isSupportHID();
    if (isHID) {
      return TransportWebHID.create(interactiveTimeout, interactiveTimeout);
    }
    if (!AdenaLedgerConnector.isSupported()) {
      throw new Error('Ledger hardware wallets are not supported in this browser.');
    }
    return TransportWebUSB.create(interactiveTimeout, interactiveTimeout);
  }

  public static async openConnected() {
    if (!AdenaLedgerConnector.isSupported()) {
      return null;
    }
    const isHID = await AdenaLedgerConnector.isSupportHID();
    if (isHID) {
      return TransportWebHID.openConnected();
    }
    return TransportWebUSB.openConnected();
  }

  public static async closeConnected() {
    try {
      const transport = await AdenaLedgerConnector.openConnected();
      await transport?.close();
      return true;
    } catch (e) {
      return false;
    }
  }

  public static async devices() {
    if (!AdenaLedgerConnector.isSupported()) {
      return [];
    }
    const isHID = await AdenaLedgerConnector.isSupportHID();
    if (isHID) {
      return TransportWebHID.list();
    }
    return TransportWebUSB.list();
  }

  public static async request() {
    if (!AdenaLedgerConnector.isSupported()) {
      return null;
    }
    const isHID = await AdenaLedgerConnector.isSupportHID();
    if (isHID) {
      return TransportWebHID.request();
    }
    return TransportWebUSB.request();
  }
}
