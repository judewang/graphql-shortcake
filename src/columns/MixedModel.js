import _ from 'lodash';
import { assertResult, thunk } from 'thelper';
import Column from './Column';
import { fromGlobalId } from '../GlobalId';

class MixedModel extends Column {
  [Symbol.toStringTag] = 'MixedModel';

  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return Number.NaN;
    return this.toString();
  }

  static get models() {
    if (typeof this.model !== 'object') {
      this.model = this.model();
    }
    return this.model;
  }

  static set models(data) {
    this.model = thunk(data);
  }

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

  static toGlobalId = _.identity;

  get id() {
    return this.valueOf();
  }

  constructor(model) {
    super(_.get(model, ['id'], model));
  }

  forge = _.identity;

  toString() {
    return this.id;
  }
}

export default models => class MixedModelItems extends MixedModel {
  static models = _.mapKeys(models, model => model.displayName);
};
