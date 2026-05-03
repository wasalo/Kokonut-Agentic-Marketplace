import type { EfpListRecord, EfpListOp } from './types';

const LIST_OP_VERSION = 1;
const LIST_RECORD_VERSION = 1;
const ADDRESS_RECORD_TYPE = 1;

export function encodeListRecord(record: EfpListRecord): Uint8Array {
  const buf = new Uint8Array(2 + record.data.length);
  buf[0] = record.version;
  buf[1] = record.recordType;
  buf.set(record.data, 2);
  return buf;
}

export function decodeListRecord(bytes: Uint8Array): EfpListRecord {
  return {
    version: bytes[0],
    recordType: bytes[1],
    data: bytes.slice(2),
  };
}

export function encodeListOp(op: EfpListOp): Uint8Array {
  const buf = new Uint8Array(2 + op.data.length);
  buf[0] = op.version;
  buf[1] = op.opcode;
  buf.set(op.data, 2);
  return buf;
}

export function decodeListOp(bytes: Uint8Array): EfpListOp {
  return {
    version: bytes[0],
    opcode: bytes[1],
    data: bytes.slice(2),
  };
}

export function addressToBytes(address: string): Uint8Array {
  const addr = address.startsWith('0x') ? address.slice(2) : address;
  const bytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    bytes[i] = parseInt(addr.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): `0x${string}` {
  let hex = '0x';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex as `0x${string}`;
}

function encodeTag(tag: string): Uint8Array {
  return new TextEncoder().encode(tag.toLowerCase().trim());
}

export function buildFollowOp(address: string): `0x${string}` {
  const addrBytes = addressToBytes(address);
  const record = encodeListRecord({
    version: LIST_RECORD_VERSION,
    recordType: ADDRESS_RECORD_TYPE,
    data: addrBytes,
  });
  const op = encodeListOp({
    version: LIST_OP_VERSION,
    opcode: 1,
    data: record,
  });
  return bytesToHex(op);
}

export function buildUnfollowOp(address: string): `0x${string}` {
  const addrBytes = addressToBytes(address);
  const record = encodeListRecord({
    version: LIST_RECORD_VERSION,
    recordType: ADDRESS_RECORD_TYPE,
    data: addrBytes,
  });
  const op = encodeListOp({
    version: LIST_OP_VERSION,
    opcode: 2,
    data: record,
  });
  return bytesToHex(op);
}

export function buildTagOp(address: string, tag: string): `0x${string}` {
  const addrBytes = addressToBytes(address);
  const record = encodeListRecord({
    version: LIST_RECORD_VERSION,
    recordType: ADDRESS_RECORD_TYPE,
    data: addrBytes,
  });
  const tagBytes = encodeTag(tag);
  const combined = new Uint8Array(record.length + tagBytes.length);
  combined.set(record);
  combined.set(tagBytes, record.length);
  const op = encodeListOp({
    version: LIST_OP_VERSION,
    opcode: 3,
    data: combined,
  });
  return bytesToHex(op);
}

export function buildUntagOp(address: string, tag: string): `0x${string}` {
  const addrBytes = addressToBytes(address);
  const record = encodeListRecord({
    version: LIST_RECORD_VERSION,
    recordType: ADDRESS_RECORD_TYPE,
    data: addrBytes,
  });
  const tagBytes = encodeTag(tag);
  const combined = new Uint8Array(record.length + tagBytes.length);
  combined.set(record);
  combined.set(tagBytes, record.length);
  const op = encodeListOp({
    version: LIST_OP_VERSION,
    opcode: 4,
    data: combined,
  });
  return bytesToHex(op);
}
