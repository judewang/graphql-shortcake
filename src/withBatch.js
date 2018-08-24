import _ from 'lodash';

export default Parent => class Builder extends Parent {
  static async batchInsert(rows, operator) {
    const { hasTimestamps, signify } = this;

    let data = _.map(rows, signify);

    const by = this.checkOperator(operator);
    if (by) {
      data = _.map(data, row => ({ ...row, created_by: by, updated_by: by }));
    }

    if (hasTimestamps) {
      const at = new Date();
      data = _.map(data, row => ({ ...row, created_at: at, updated_at: at }));
    }

    return this.database
      .batchInsert(this.tableName, data)
      .returning(_.snakeCase(this.idAttribute));
  }

  static async batchDestroy(rows, operator) {
    const { softDelete } = this;
    const idAttribute = _.snakeCase(this.idAttribute);

    const ids = _.map(rows, id => this.fromGlobalId(id));
    const mutate = this.mutate.whereIn(idAttribute, ids);

    if (!softDelete) return mutate.delete();

    const by = this.checkOperator(operator);

    const data = { deletedAt: new Date() };
    if (by) data.deletedBy = by;

    return mutate.whereNull('deleted_at').update(this.signify(data));
  }

  static async batchUpdate(rows, changes, operator) {
    const { hasTimestamps, softDelete } = this;
    const idAttribute = _.snakeCase(this.idAttribute);

    const ids = _.map(rows, id => this.fromGlobalId(id));
    const mutate = this.mutate.whereIn(idAttribute, ids);

    const data = changes;

    const by = this.checkOperator(operator);
    if (by) data.updatedBy = by;
    if (hasTimestamps) data.updatedAt = new Date();
    if (softDelete) mutate.whereNull('deleted_at');

    return mutate.update(this.signify(data));
  }
};
