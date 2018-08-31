import _ from 'lodash';
import { assertResult } from 'thelper';
import { fromGlobalId, isGlobalId } from './GlobalId';

export class MixedModelHandler {
  static async load(value, error) {
    const { models } = this;
    return Promise.resolve()
      .then(async () => {
        const id = fromGlobalId(value);
        if (!id) return null;
        const Model = models[id.type];
        if (!Model) return null;
        return Model.load(`${id}`);
      })
      .then(model => assertResult(model, error));
  }

  static async loadMany(ids, ...args) {
    return Promise.all(_.map(ids, id => this.load(id, ...args)));
  }

  constructor(model) {
    if (model && model.id) {
      this.id = model.id;
    } else if (isGlobalId(model)) {
      this.id = model;
    }
  }

  valueOf() {
    return this.id;
  }

  load(error) {
    return this.constructor.load(this.id, error);
  }
}

export default models => class MixedModel extends MixedModelHandler {
  static models = _.mapKeys(models, model => model.displayName);
};
