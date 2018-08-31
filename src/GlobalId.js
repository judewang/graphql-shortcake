import _ from 'lodash';
import base from 'base-x';
import BigNumber from 'bignumber.js';

const bs62 = base('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');
const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuidParser = /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/;

export default class GlobalId {
  [Symbol.toStringTag] = 'GlobalId';

  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return Number.NaN;
    return this.toString();
  }

  constructor(id, type, format = 'S') {
    this.id = id;
    this.type = type;
    this.format = format;
  }

  valueOf() {
    const { id, format } = this;
    if (format === 'N') {
      return new BigNumber(id.toString('hex'), 16).toString(10);
    }

    if (format === 'U') {
      const data = uuidParser.exec(_.padStart(id.toString('hex'), 32, 0));
      return `${data[1]}-${data[2]}-${data[3]}-${data[4]}-${data[5]}`;
    }

    return id.toString();
  }

  toString() {
    const { id, type, format } = this;
    const typeBuf = Buffer.from(`${type}:`);
    const value = bs62.encode(Buffer.concat([typeBuf, id], typeBuf.length + id.length));
    return `i${format}${value}`;
  }
}

export function isGlobalId(globalId) {
  return /^i[NUS][\w\d]+$/.test(globalId);
}

function convertGlobalId(id) {
  const data = bs62.decode(id.substr(2));
  const symbol = data.indexOf(':');

  const typeBuf = Buffer.allocUnsafe(symbol);
  data.copy(typeBuf, 0, 0, symbol);

  const idBuf = Buffer.allocUnsafe(data.length - symbol - 1);
  data.copy(idBuf, 0, symbol + 1, data.length);

  return { idBuf, type: typeBuf.toString() };
}

function convertId(value) {
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

export function fromGlobalId(value, verification) {
  if (!isGlobalId(value)) {
    if (!/^[\w-]+$/.test(value)) throw TypeError('invalid native id');
    return value;
  }

  const format = value[1];
  const { idBuf, type } = convertGlobalId(value);

  const globalId = new GlobalId(idBuf, type, format);
  if (verification) {
    if (verification !== globalId.type) {
      throw TypeError('invalid global type');
    }
    return globalId.valueOf();
  }
  return globalId;
}

export function toGlobalId(type, id) {
  if (isGlobalId(id)) {
    const { type: verification } = convertGlobalId(id);
    if (verification !== type) throw TypeError('invalid native id');
    return id;
  }

  const { idBuf, format } = convertId(id);
  const globalId = new GlobalId(idBuf, type, format);
  return globalId.toString();
}
