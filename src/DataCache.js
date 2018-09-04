/* eslint no-param-reassign: ["error", { "ignorePropertyModificationsFor": ["target"] }] */
import _ from 'lodash';
import DataLoader from 'dataloader';
import { assertResult } from 'thelper';
import { fromGlobalId } from './GlobalId';

class DataCache {
  static async loader(globalIds) {
    return Promise.all(_.map(globalIds, async (globalId) => {
      const id = fromGlobalId(globalId);

      const Model = this.models[id.type];
      if (!Model) return null;

      const model = await Model.load(id.valueOf());
      if (!model) return null;

      return { Model, data: model.previous };
    }));
  }

  static get(target, name) {
    const loader = /^load(.+)$/ig.exec(String(name));
    const className = _.upperFirst(loader ? loader[1] : name);
    const Model = target.get(className);
    if (Model) {
      if (loader) return (id, error) => target.loadModel(Model, id, error);
      return target.create(className);
    }

    return target[name];
  }

  dataloader = null;

  constructor() {
    const { loader, get } = this.constructor;
    this.dataloader = new DataLoader(
      loader.bind(this.constructor),
      { cacheMap: new Map() },
    );

    return new Proxy(this, { get });
  }

  async loadModel(Model, id, error) {
    try {
      return this.load(Model.toGlobalId(id), error);
    } catch (e) {
      return assertResult(null, error);
    }
  }

  async load(id, error) {
    return Promise.resolve()
      .then(async () => {
        const result = await this.dataloader.load(id);
        if (!result) return null;

        const { Model, data } = result;
        const model = new Model({}, { cache: this });
        model.forge(data);
        return model;
      })
      .then(model => assertResult(model, error));
  }

  async loadMany(ids, ...args) {
    return Promise.all(_.map(ids, id => this.load(id, ...args)));
  }

  get(name) {
    const { models } = this.constructor;
    return models[name];
  }

  create(name) {
    const Model = this.get(name);
    const model = new Model({}, { cache: this });
    return model;
  }

  prime(id, model) {
    const { dataloader } = this;

    dataloader.prime(id, {
      Model: model.constructor,
      data: model.previous,
    });
    _.set(model, 'cache', this);

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

export default models => class DataCacheModels extends DataCache {
  static models = _.mapKeys(models, 'displayName');
};
