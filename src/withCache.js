/* eslint no-param-reassign: ["error", { "ignorePropertyModificationsFor": ["target"] }] */
import _ from 'lodash';
import { isErrorPrototype } from 'thelper';
import DataCache from './DataCache';

export default Parent => class Cache extends Parent {
  static load(...args) {
    const error = _.isError(args[1]) || isErrorPrototype(args[1]) ? args[1] : undefined;
    const cache = args[1] instanceof DataCache ? args[1] : args[2];

    const id = this.toGlobalId(args[0]);
    const nativeId = this.fromGlobalId(args[0]);

    const promise = Promise.resolve({});
    const next = promise.then;

    if (cache) {
      return Object.assign(promise, {
        id,
        nativeId,
        then: (resolve, rejects) => next
          .call(promise, () => cache.load(id, error))
          .then(resolve, rejects),
      });
    }

    return super.load(nativeId, error);
  }

  static get(target, name) {
    if (name === 'cache' && !target.cache) {
      const ModelCache = target.constructor.cache;
      if (ModelCache) target.cache = new ModelCache();
    }

    const result = super.get(target, name);
    if (result !== undefined) return result;

    if (target.cache) return target.cache[name];

    return undefined;
  }

  constructor(attrs, options) {
    super(attrs, options);
    this.cache = _.get(options, ['cache'], null);
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
