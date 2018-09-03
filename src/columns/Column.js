/* eslint class-methods-use-this: ["error", { "exceptMethods": ["toString"] }] */
export default class Column {
  constructor(value) {
    this.value = value;
  }

  valueOf() {
    return this.value;
  }

  toString() {
    return toString.call(this);
  }

  toJSON() {
    return this.toString();
  }
}
