import _ from 'lodash';
import { assertResult } from 'thelper';

export default Parent => class Fetcher extends Parent {
  async fetch(error) {
    this.limit(1);
    const results = await this.find();
    return assertResult(this.forge(results[0] || null), error);
  }

  async fetchAll(error) {
    const results = await this.find();

    assertResult(results.length, error);
    return results;
  }

  async fetchPage(options, error) {
    const { offset, first } = _.defaults(options, { offset: 0, first: 1000 });
    this.limit(first).offset(offset);
    return this.fetchAll(error);
  }

  async fetchCount(error) {
    const { builder } = this;
    builder.select = ['count(*)'];
    const results = await this.constructor.exec(builder);
    const count = parseInt(results[0].count, 10);
    assertResult(count, error);
    return count;
  }
};
