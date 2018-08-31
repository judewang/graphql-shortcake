export class Enum {
  [Symbol.toStringTag] = 'Enum';

  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return this.valueOf();
    return this.toString();
  }

  constructor(value) {
    if (typeof value === 'number') {
      this.value = value;
      return;
    }

    const { items } = this.constructor;
    this.value = items.indexOf(value);
  }

  valueOf() {
    return this.value;
  }

  toString() {
    const { items } = this.constructor;
    return items[this.value];
  }
}

export default items => class EnumItems extends Enum {
  static items = items;
};
