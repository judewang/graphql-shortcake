import _ from 'lodash';
import crypto from 'crypto';
import Column from './Column';

export default class Hash extends Column {
  [Symbol.toStringTag] = 'Hash';

  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return Number.NaN;
    return this.toString();
  }

  constructor(value) {
    super(value);
    if (/[\da-f]+:[\da-f]+/.test(value)) return;

    const salt = crypto.randomBytes(8);
    const password = crypto.pbkdf2Sync(value, salt, 8727, 512, 'sha512');
    this.value = `${salt.toString('hex')}:${password.toString('hex')}`;
  }

  verify(value) {
    try {
      const [salt, hash] = _.split(this.value, ':', 2);

      if (crypto
        .pbkdf2Sync(value, Buffer.from(salt, 'hex'), 8727, 512, 'sha512')
        .toString('hex') !== hash) throw new Error();

      return true;
    } catch (error) {
      return false;
    }
  }
}
