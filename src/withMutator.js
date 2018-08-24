import _ from 'lodash';

export default Parent => class Mutator extends Parent {
  get changes() {
    const data = _.omitBy(
      this.valueOf(),
      (value, key) => _.isEqual(this._.previous[key], value),
    );

    return data;
  }

  async add(values, operator) {
    const { hasTimestamps } = this.constructor;

    const by = this.constructor.checkOperator(operator);

    if (by) {
      _.set(values, ['createdBy'], by);
      _.set(values, ['updatedBy'], by);
    }

    if (hasTimestamps) {
      const at = new Date();
      _.set(values, ['createdAt'], at);
      _.set(values, ['updatedAt'], at);
    }

    return this.insert(values);
  }

  async modify(changes, operator) {
    const { hasTimestamps } = this.constructor;

    const by = this.constructor.checkOperator(operator);

    if (_.size(changes) < 1) return this;

    if (by) _.set(changes, ['updatedBy'], by);
    if (hasTimestamps) _.set(changes, ['updatedAt'], new Date());

    return this.update(changes);
  }

  async save(operator) {
    if (this.isNew) return this.add(this.valueOf(), operator);
    return this.modify(this.changes, operator);
  }

  async saveIfNotExists(operator) {
    const reply = await this.fetch();
    if (reply) return this;
    return this.save(operator);
  }

  async destroy(operator) {
    const { softDelete } = this.constructor;
    const by = this.constructor.checkOperator(operator);

    if (!softDelete) return this.delete();

    if (this.valueOf('deletedBy')) return this;

    const data = { deletedAt: new Date() };
    if (by) data.deletedBy = by;

    return this.update(data);
  }
};
