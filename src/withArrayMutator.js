import _ from 'lodash';

export default Parent => class ArrayMutator extends Parent {
  async appendValue(column, value, operator) {
    const { database, signify } = this.constructor;

    const snake = signify(column);
    const changes = _.set({}, snake, database.raw(`array_append(array_remove(${snake}, ?), ?)`, [value, value]));
    return this.modify(changes, operator);
  }

  async removeValue(column, value, operator) {
    const { database, signify } = this.constructor;

    const snake = signify(column);
    const changes = _.set({}, snake, database.raw(`array_remove(${snake}, ?)`, [value]));
    return this.modify(changes, operator);
  }
};
