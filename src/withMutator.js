import _ from 'lodash';

export default Parent => class Mutator extends Parent {
  get changes() {
    const filter = (value, key) => _.isEqual(this.previous[key], value);
    return _.omitBy(this.values, filter);
  }

  async add(values, ...args) {
    const [by, error] = this.constructor.assertOperator(...args);
    if (by) {
      _.set(values, ['createdBy'], by);
      _.set(values, ['updatedBy'], by);
    }

    const { hasTimestamps } = this.constructor;
    if (hasTimestamps) {
      const at = new Date();
      _.set(values, ['createdAt'], at);
      _.set(values, ['updatedAt'], at);
    }

    return this.insert(values, error);
  }

  async modify(changes, ...args) {
    if (_.size(changes) < 1) return this;

    const [by, error] = this.constructor.assertOperator(...args);
    if (by) _.set(changes, ['updatedBy'], by);

    const { hasTimestamps } = this.constructor;
    if (hasTimestamps) _.set(changes, ['updatedAt'], new Date());

    return this.update(changes, error);
  }

  async modifyIfMatches(...args) {
    return this.limit(1).modify(...args);
  }

  async save(...args) {
    if (this.isNew) return this.add(this.values, ...args);
    return this.modify(this.changes, ...args);
  }

  async saveIfNotExists(operator) {
    const result = await this.fetch();
    if (!result) await this.save(operator);
    return this;
  }

  async destroy(...args) {
    const { softDelete } = this.constructor;
    if (!softDelete) return this.delete(...args);

    if (this.valueOf('deletedBy')) return this;

    const data = { deletedAt: new Date() };

    const [by, error] = this.constructor.assertOperator(...args);
    if (by) data.deletedBy = by;

    return this.update(data, error);
  }
};
