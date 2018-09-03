/* eslint no-param-reassign: ["error", { "ignorePropertyModificationsFor": ["target"] }] */
import _ from 'lodash';
import Column from './Column';

export class ShortcakeDate extends Column {
  [Symbol.toStringTag] = 'DateTime.Date';

  constructor(value) {
    super(new Date(value));

    const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (date) {
      this.value = new Date(Date.UTC(
        Number(date[1]), Number(date[2]) - 1, Number(date[3]), 0, 0, 0,
      ));
    }
  }

  valueOf() {
    const year = this.value.getUTCFullYear();
    const month = this.value.getUTCMonth();
    const date = this.value.getUTCDate();
    return `${year}-${_.padStart(month + 1, 2, '0')}-${_.padStart(date, 2, '0')}`;
  }

  toString() {
    return this.valueOf();
  }

  toJSON() {
    return toString.call(this);
  }
}

export class ShortcakeTime extends Column {
}

export default class DateTime extends Column {
  static Date = ShortcakeDate;

  static Time = ShortcakeTime;

  static get = (target, name) => (target[name] || target.get(name));

  [Symbol.toStringTag] = 'DateTime';

  constructor(date) {
    super(new Date(date));

    const { get } = this.constructor;
    return new Proxy(this, { get });
  }

  get(name) {
    return this.value[name];
  }
}
