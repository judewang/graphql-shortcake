import _ from 'lodash';
import base from 'base-x';
import BigNumber from 'bignumber.js';

const bs62 = base('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuidParser = /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/;

export default class GlobalId {
  constructor(id, type, format = 'S') {
    this._.id = Buffer.from(id);
    this._.type = type;
    this._.format = format;
  }

  _ = {};

  get type() {
    return this._.type;
  }

  get id() {
    return this._.id;
  }

  toBigint() {
    return new BigNumber(this.id.toString('hex'), 16).toString(10);
  }

  toUUID() {
    const data = uuidParser.exec(_.padStart(this.id.toString('hex'), 32, 0));
    return `${data[1]}-${data[2]}-${data[3]}-${data[4]}-${data[5]}`;
  }

  toString() {
    if (this._.format === 'N') {
      return this.toBigint();
    }

    if (this._.format === 'U') {
      return this.toUUID();
    }

    return this.id.toString();
  }

  toJSON() {
    return this.toString();
  }
}

export function isGlobalId(globalId) {
  return /^i[NUS][\w\d]+$/.test(globalId);
}

function fromId(value) {
  if (Buffer.isBuffer(value)) {
    return { format: 'S', idBuf: value };
  }

  const id = _.toString(value);

  if (uuid.test(id)) {
    const idHex = id.replace(/-/gi, '');
    const buf = Buffer.alloc(16);
    for (let idx = 0; idx < 32; idx += 2) {
      buf.writeUInt8(`0x${idHex[idx]}${idHex[idx + 1]}`, idx / 2);
    }
    return { format: 'U', idBuf: buf };
  }

  if (/^\d+$/gi.test(id)) {
    const idHex = _.padStart(new BigNumber(id, 10).toString(16), 16, 0);
    const buf = Buffer.alloc(8);
    for (let idx = 0; idx < 16; idx += 2) {
      buf.writeUInt8(`0x${idHex[idx]}${idHex[idx + 1]}`, idx / 2);
    }
    return { format: 'N', idBuf: buf };
  }

  return { format: 'S', idBuf: Buffer.from(id) };
}

export function toGlobalId(type, id) {
  const typeBuf = Buffer.from(`${type}:`);
  const { format, idBuf } = fromId(id);
  const value = bs62.encode(Buffer.concat([typeBuf, idBuf], typeBuf.length + idBuf.length));
  return `i${format}${value}`;
}

export function fromGlobalId(value, verification) {
  try {
    if (!isGlobalId(value)) throw new TypeError();

    const buf = bs62.decode(value.substr(2));
    const splitIdx = buf.indexOf(':');

    const typeBuf = Buffer.allocUnsafe(splitIdx);
    buf.copy(typeBuf, 0, 0, splitIdx);
    const type = typeBuf.toString();

    const idBuf = Buffer.allocUnsafe(buf.length - splitIdx - 1);
    buf.copy(idBuf, 0, splitIdx + 1, buf.length);

    const gid = new GlobalId(idBuf, type, value[1]);

    if (verification) {
      if (verification !== type) throw TypeError();
      return gid.toString();
    }

    return gid;
  } catch (error) {
    throw TypeError('invalid global id');
  }
}
