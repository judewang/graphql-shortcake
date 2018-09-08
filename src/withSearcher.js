import _ from 'lodash';

export default Parent => class Searcher extends Parent {
  static keywordAttribute = 'keyword';

  static toKeyword = null;

  async search(keyword) {
    const { keywordAttribute } = this.constructor;
    const query = _.trim(_.replace(keyword, /[ &|)(]+/g, text => (/&/.test(text) ? '&' : '|')), '|&)(');
    this.select(`ts_rank(${keywordAttribute}, query) as rank`);
    this.joinRaw(', to_tsquery(?) as query', query);
    this.whereRaw(`${keywordAttribute} @@ query`);
    this.orderByDesc('rank');
    return this;
  }

  async insert(values, ...args) {
    const { keywordAttribute, toKeyword } = this.constructor;
    if (toKeyword) {
      _.set(values, [keywordAttribute], toKeyword(values));
    }
    return super.insert(values, ...args);
  }

  async update(changes, ...args) {
    const { keywordAttribute, toKeyword } = this.constructor;
    if (toKeyword) {
      _.set(changes, [keywordAttribute], toKeyword({ ...this.values, ...changes }));
    }
    return super.update(changes, ...args);
  }
};
