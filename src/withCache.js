/* eslint no-param-reassign: ["error", { "ignorePropertyModificationsFor": ["target"] }] */
import _ from 'lodash';
import { invokeNull } from 'thelper';

export default Parent => class Cache extends Parent {
  static get(target, name) {
    const result = super.get(target, name);
    if (result !== undefined) return result;

    if (target.cache) return target.cache[name];

    return undefined;
  }

  constructor(attrs, options) {
    super(attrs, options);
    this.cache = _.get(options, ['cache'], null);
  }

  initialize() {
    super.initialize();
    this.cache = null;
  }

  load(error) {
    if (this.cache) {
      return this.cache
        .loadModel(this.valueOf(), error, this.constructor)
        .then(invokeNull(this.forge.bind(this)));
    }

    return super.load(error);
  }

  clone(options) {
    const model = super.clone(_.defaults(options, {
      cache: this.cache,
    }));
    return model;
  }

  prime() {
    const { cache, id } = this;
    if (cache && id) cache.prime(id, this);
    return this;
  }

  clear() {
    const { cache, id } = this;
    if (cache && id) cache.clear(id);
    return this;
  }

  async find(...args) {
    const results = await super.find(...args);
    _.forEach(results, (target) => {
      target.cache = this.cache;
      target.prime();
    });
    return results;
  }

  async insert(...args) {
    const result = await super.insert(...args);
    this.prime();
    return result;
  }

  async destroy(...args) {
    const result = await super.destroy(...args);
    this.clear();
    return result;
  }
};
