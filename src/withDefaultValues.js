/* eslint no-underscore-dangle: ["error", { "allow": ["_defaultValues"] }] */

import _ from 'lodash';
import { thunkPromise } from 'thelper';

export default Parent => class DefaultValues extends Parent {
  static set defaultValues(values) {
    this._defaultValues = thunkPromise(values);
  }

  static async batchInsert(rows, operator, cache) {
    const { _defaultValues } = this;

    let data = rows;
    if (_defaultValues) {
      data = await Promise.all(_.map(rows, async (row) => {
        const defaults = await _defaultValues(row, cache);
        return _.defaultsDeep(row, defaults);
      }));
    }

    return super.batchInsert(data, operator, cache);
  }

  async add(values, operator) {
    const { _defaultValues } = this.constructor;

    let data = values;
    if (_defaultValues) {
      const defaults = await _defaultValues(values, this.cache);
      data = _.defaultsDeep(values, defaults);
    }

    return super.add(data, operator);
  }
};
