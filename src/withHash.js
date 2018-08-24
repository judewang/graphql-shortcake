import _ from 'lodash';
import crypto from 'crypto';

export default Parent => class Hash extends Parent {
  hash(column, value) {
    const values = this.valueOf();

    if (_.isNil(value)) {
      values[column] = null;
      return this;
    }

    const salt = crypto.randomBytes(8);
    const password = crypto.pbkdf2Sync(value, salt, 8727, 512, 'sha512');
    values[column] = `${salt.toString('hex')}:${password.toString('hex')}`;

    return this;
  }

  verify(column, value) {
    const raw = this[column];

    try {
      const [salt, hash] = _.split(raw, ':', 2);

      if (crypto
        .pbkdf2Sync(value, Buffer.from(salt, 'hex'), 8727, 512, 'sha512')
        .toString('hex') !== hash) throw new Error();

      return true;
    } catch (error) {
      return false;
    }
  }
};
