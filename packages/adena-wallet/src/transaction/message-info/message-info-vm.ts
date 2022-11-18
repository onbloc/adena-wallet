import { InfoType } from './message-info-type';
import protobuf from 'protobufjs';

interface Package {
  name: string;
  path: string;
  files: Array<PackageFile>;
}

interface PackageFile {
  name: string;
  body: string;
}

export interface VmCall extends InfoType {
  caller: string;
  send: string;
  pkg_path: string;
  func: string;
  args: Array<string>;
}

export interface VmAddPackage extends InfoType {
  creator: string;
  package?: Package;
  deposit: string;
}

export const encodeVmCall = (writer: protobuf.Writer, messageInfo: VmCall) => {
  if (messageInfo.caller !== '') {
    writer.uint32(10).string(messageInfo.caller);
  }
  if (messageInfo.send !== '') {
    writer.uint32(18).string(messageInfo.send);
  }
  if (messageInfo.pkg_path !== '') {
    writer.uint32(26).string(messageInfo.pkg_path);
  }
  if (messageInfo.func !== '') {
    writer.uint32(34).string(messageInfo.func);
  }
  for (const v of messageInfo.args) {
    writer.uint32(42).string(v!);
  }
  return writer;
};

const encodePackageFile = (writer: protobuf.Writer, messageInfo: PackageFile) => {
  if (messageInfo.name !== '') {
    writer.uint32(10).string(messageInfo.name);
  }
  if (messageInfo.body !== '') {
    writer.uint32(18).string(messageInfo.body);
  }
  return writer;
};

const encodePackage = (writer: protobuf.Writer, messageInfo: Package) => {
  if (messageInfo.name !== '') {
    writer.uint32(10).string(messageInfo.name);
  }
  if (messageInfo.path !== '') {
    writer.uint32(18).string(messageInfo.path);
  }
  for (const file of messageInfo.files) {
    encodePackageFile(writer.uint32(26).fork(), file).ldelim();
  }
  return writer;
};

export const encodeVmAddPackage = (writer: protobuf.Writer, messageInfo: VmAddPackage) => {
  if (messageInfo.creator !== '') {
    writer.uint32(10).string(messageInfo.creator);
  }
  if (messageInfo.package !== undefined) {
    encodePackage(writer.uint32(18).fork(), messageInfo.package).ldelim();
  }
  if (messageInfo.deposit !== '') {
    writer.uint32(26).string(messageInfo.deposit);
  }
  return writer;
};
