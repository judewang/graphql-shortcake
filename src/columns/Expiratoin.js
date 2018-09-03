import Column from './Column';

export default class Expiratoin extends Column {
  [Symbol.toStringTag] = 'Expiratoin';

  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return Number.NaN;
    return this.toString();
  }

  constructor(value) {
    super(new Date(value));
  }

  toString() {
    const result = this.value.getTime() < Date.now();
    return result || this.value.toISOString();
  }
}
