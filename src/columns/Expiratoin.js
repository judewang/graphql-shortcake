export default class Expiratoin {
  [Symbol.toStringTag] = 'Expiratoin';

  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return Number.NaN;
    return this.toString();
  }

  constructor(value) {
    this.value = new Date(value);
  }

  valueOf() {
    return this.value;
  }

  toString() {
    return this.value.getTime() < Date.now();
  }
}
