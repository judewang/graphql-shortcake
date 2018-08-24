import _ from 'lodash';

export default Parent => class Searcher extends Parent {
  static keywordAttribute = 'keyword';

  static toKeyword = null;

  async search(keyword) {
    const { database, keywordAttribute } = this.constructor;
    const query = _.trim(_.replace(keyword, /[ &|)(]+/g, text => (/&/.test(text) ? '&' : '|')), '|&)(');
    this.select(database.raw(`ts_rank(${keywordAttribute}, query) as rank`));
    this.joinRaw(database.raw(', to_tsquery(?) as query', query));
    this.whereRaw(`${keywordAttribute} @@ query`);
    this.orderBy('rank', 'desc');
    return this;
  }

  async add(values, ...args) {
    const { keywordAttribute, toKeyword } = this.constructor;
    if (toKeyword) {
      _.set(values, [keywordAttribute], toKeyword(values));
    }
    return super.add(values, ...args);
  }

  async modify(changes, ...args) {
    const { keywordAttribute, toKeyword } = this.constructor;
    if (toKeyword && _.size(changes) > 0) {
      _.set(changes, [keywordAttribute], toKeyword({ ...this.valueOf(), ...changes }));
    }
    return super.modify(changes, ...args);
  }
};
