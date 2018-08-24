/* eslint no-param-reassign: ["error", { "ignorePropertyModificationsFor": ["target"] }] */
import _ from 'lodash';
import DataLoader from 'dataloader';
import { assertResult } from 'thelper';
import { fromGlobalId } from './GlobalId';

export default class DataCache {
  static async loader(ids) {
    return Promise.all(_.map(ids, async (id) => {
      const gid = fromGlobalId(id);
      const Model = this[gid.type];
      if (!Model) return null;

      return Model.load(gid.toString());
    }));
  }

  static get(target, name) {
    if (!_.isUndefined(target[name])) return target[name];

    if (!_.isString(name)) return undefined;

    const loader = /^load(.+)$/ig.exec(name);
    const className = _.upperFirst(loader ? loader[1] : name);
    const Model = target.constructor[className];
    if (Model) {
      if (loader) return (id, error) => target.loadModel(id, error, Model);
      return target.create(className);
    }

    return undefined;
  }

  static set(target, name, value) {
    target[name] = value;
  }

  dataloader = null;

  constructor() {
    const { loader, get, set } = this.constructor;

    this.dataloader = new DataLoader(
      loader.bind(this.constructor),
      { cacheMap: new Map() },
    );

    return new Proxy(this, { get, set });
  }

  async loadModel(key, error, Model) {
    const id = Model.toGlobalId(key);
    const nativeId = Model.fromGlobalId(key);

    const promise = Promise.resolve({});
    const next = promise.then;

    return Object.assign(promise, {
      id,
      nativeId,
      then: (resolve, rejects) => next
        .call(promise, async () => {
          const model = await this.load(id, error);
          if (model && model.constructor !== Model) return null;
          return model;
        })
        .then(model => assertResult(model, error))
        .then(resolve, rejects),
    });
  }

  async load(id, error) {
    const promise = Promise.resolve({});
    const next = promise.then;

    return Object.assign(promise, {
      id,
      then: (resolve, rejects) => next
        .call(promise, async () => {
          const model = await this.dataloader.load(id);
          if (!model) return null;
          return model.clone({ cache: this });
        })
        .then(model => assertResult(model, error))
        .then(resolve, rejects),
    });
  }

  async loadMany(ids, ...args) {
    return Promise.all(_.map(ids, id => this.load(id, ...args)));
  }

  create(name) {
    const Model = this.constructor[name];
    const model = new Model({}, { cache: this });
    return model;
  }

  prime(id, newModel) {
    const { dataloader } = this;

    const gid = fromGlobalId(id);
    if (!this.constructor[gid.type]) return this;

    dataloader.clear(id);
    if (newModel) {
      dataloader.prime(id, newModel);
      _.set(newModel, 'cache', this);
    }

    return this;
  }

  clear(id) {
    this.dataloader.clear(id);
    return this;
  }

  clearAll() {
    this.dataloader.clearAll();
    return this;
  }
}
