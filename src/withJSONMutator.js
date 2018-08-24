import _ from 'lodash';

export default Parent => class JSONMutator extends Parent {
  async addKeyValue(column, key, value, operator) {
    const { database, signify } = this.constructor;

    const snake = signify(column);
    const item = _.set({}, key, value);
    const changes = _.set({}, snake, database.raw(`coalesce(${snake}, '{}') || ?`, [item]));
    return this.modify(changes, operator);
  }

  async delKeyValue(column, key, operator) {
    const { database, signify } = this.constructor;

    const snake = signify(column);
    const changes = _.set({}, snake, database.raw(`coalesce(${snake}, '{}') - ?`, [key]));
    return this.modify(changes, operator);
  }
};
