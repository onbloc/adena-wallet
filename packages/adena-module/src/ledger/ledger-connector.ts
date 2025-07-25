import { LedgerConnector as AminoLedgerConnector } from '@cosmjs/ledger-amino';
import Transport from '@ledgerhq/hw-transport';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import TransportWebUSB from '@ledgerhq/hw-transport-webusb';

export class AdenaLedgerConnector extends AminoLedgerConnector {
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
    return TransportWebUSB.create(interactiveTimeout, interactiveTimeout);
  }

  public static async openConnected() {
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
    const isHID = await AdenaLedgerConnector.isSupportHID();
    if (isHID) {
      return TransportWebHID.list();
    }
    return TransportWebUSB.list();
  }

  public static async request() {
    const isHID = await AdenaLedgerConnector.isSupportHID();
    if (isHID) {
      return TransportWebHID.request();
    }
    return TransportWebUSB.request();
  }
}
