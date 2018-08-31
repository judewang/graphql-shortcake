/* eslint no-param-reassign: ["error", { "ignorePropertyModificationsFor": ["target"] }] */
import _ from 'lodash';
import DataLoader from 'dataloader';
import { assertResult } from 'thelper';
import { fromGlobalId } from './GlobalId';

export default class DataCache {
  static async loader(globalIds) {
    return Promise.all(_.map(globalIds, async (globalId) => {
      const id = fromGlobalId(globalId);
      const Model = this[id.type];
      if (!Model) return null;

      return Model.load(`${id}`);
    }));
  }

  static get(target, name) {
    const result = target[name];
    if (!_.isUndefined(result)) return result;

    if (_.isString(name)) {
      const loader = /^load(.+)$/ig.exec(name);
      const className = _.upperFirst(loader ? loader[1] : name);
      const Model = target.constructor[className];
      if (Model) {
        if (loader) return (id, error) => target.loadModel(id, error, Model);
        return target.create(className);
      }
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
    try {
      const id = Model.toGlobalId(key);
      const model = await this.load(id, error);
      return model;
    } catch (e) {
      return assertResult(null, error);
    }
  }

  async load(id, error) {
    try {
      const model = await this.dataloader.load(id);
      if (!model) throw new TypeError();
      return model.clone({ cache: this });
    } catch (e) {
      return assertResult(null, error);
    }
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
