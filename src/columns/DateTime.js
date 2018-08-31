/* eslint no-param-reassign: ["error", { "ignorePropertyModificationsFor": ["target"] }] */
import _ from 'lodash';

export class ShortcakeDate {
  constructor(value) {
    const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (date) {
      this.value = new Date(Date.UTC(
        Number(date[1]), Number(date[2]) - 1, Number(date[3]), 0, 0, 0,
      ));
      return;
    }

    this.value = new Date(value);
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
}

export class ShortcakeTime {
}

export default class DateTime {
  static Date = ShortcakeDate;

  static Time = ShortcakeTime;

  [Symbol.toStringTag] = 'DateTime';

  [Symbol.toPrimitive](hint) {
    return this.value[Symbol.toPrimitive](hint);
  }

  constructor(date) {
    this.value = new Date(date);
    return new Proxy(this, {
      get(target, name) {
        const result = target[name];
        return result || target.value[name];
      },
      set(target, name, value) {
        target.value[name] = value;
      },
    });
  }

  valueOf() {
    return this.value;
  }
}
