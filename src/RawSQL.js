export default class RawSQL {
  constructor(sql, values) {
    this.sql = sql;
    this.values = values;
  }

  valueOf() {
    return [this.sql, this.values || []];
  }

  toJSON() {
    return this.valueOf();
  }
}
