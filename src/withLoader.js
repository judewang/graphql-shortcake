/* eslint no-underscore-dangle: ["error", { "allow": ["_dataloader"] }] */
/* eslint no-param-reassign: ["error", { "ignorePropertyModificationsFor": ["target"] }] */

import _ from 'lodash';
import DataLoader from 'dataloader';
import { assertResult } from 'thelper';

export default Parent => class Loader extends Parent {
  static get dataloader() {
    let loader = _.get(this, ['_dataloader', this.displayName]);

    if (!loader) {
      loader = new DataLoader(this.loader.bind(this), { cache: false });
      _.set(this, ['_dataloader', this.displayName], loader);
    }

    return loader;
  }

  static async loader(ids) {
    const { idAttribute, softDelete, query } = this;
    const collections = {};

    query.whereIn(this.signify(idAttribute), _.uniq(ids));
    if (softDelete) query.whereNull('deleted_at');

    _.forEach(await query, (item) => {
      const obj = this.format(item);
      collections[obj[idAttribute]] = obj;
    });

    return _.map(ids, id => (collections[id] || null));
  }

  static load(value, error) {
    return Promise.resolve()
      .then(async () => {
        const id = this.fromGlobalId(value);
        if (!id) return null;
        return this.dataloader.load(id);
      })
      .then(data => this.forge(data))
      .then(model => assertResult(model, error));
  }

  static async loadMany(ids, ...args) {
    return Promise.all(_.map(ids, id => this.load(id, ...args)));
  }
};
