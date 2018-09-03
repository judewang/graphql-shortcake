import Column from './Column';

export class Enum extends Column {
  [Symbol.toStringTag] = 'Enum';

  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return this.valueOf();
    return this.toString();
  }

  constructor(value) {
    super(value);
    if (typeof value === 'number') return;

    const { items } = this.constructor;
    this.value = items.indexOf(value);
  }

  toString() {
    const { items } = this.constructor;
    return items[this.value];
  }
}

export default items => class EnumItems extends Enum {
  static items = items;
};
