/* eslint no-param-reassign: ["error", { "ignorePropertyModificationsFor": ["target"] }] */
import _ from 'lodash';
import fp from 'lodash/fp';
import { invokeNull, assertResult } from 'thelper';
import withArrayMutator from './withArrayMutator';
import withBuilder from './withBuilder';
import withBatch from './withBatch';
import withCache from './withCache';
import withColumn from './withColumn';
import withDefaultValues from './withDefaultValues';
import withFetcher from './withFetcher';
import withGlobalId from './withGlobalId';
import withIncrementer from './withIncrementer';
import withJSONMutator from './withJSONMutator';
import withLoader from './withLoader';
import withMutator from './withMutator';
import withSearcher from './withSearcher';

const refreshViews = {};

class Model {
  static database = null;

  static tableName = null;

  static viewName = null;

  static idAttribute = 'id';

  static hasOperator = false;

  static hasTimestamps = true;

  static softDelete = true;

  static get(target, name) {
    if (this.has(target, name)) {
      return target.get(name);
    }

    return target[name];
  }

  static set(target, name, value) {
    if (this.has(target, name)) {
      target.set(name, value);
      return;
    }

    target[name] = value;
  }

  static get displayName() {
    return this.name;
  }

  static get refreshView() {
    const { displayName, viewName, database } = this;
    if (!refreshViews[displayName]) {
      refreshViews[displayName] = _.debounce(() => {
        database.raw(`REFRESH MATERIALIZED VIEW ${viewName};`);
      }, 500, { maxWait: 2000 });
    }

    return refreshViews[displayName];
  }

  static has(target, name) {
    return target.ownKeys.indexOf(name) > -1;
  }

  static ownKeys(target) {
    return target.ownKeys;
  }

  static getOwnPropertyDescriptor(target, name) {
    if (this.has(target, name)) {
      return { configurable: true, enumerable: true, value: target.get(name) };
    }

    return Object.getOwnPropertyDescriptor(target, name);
  }

  static raw(...args) {
    return this.database.raw(...args);
  }

  static forge(attributes, options) {
    const model = new this({}, options);
    return model.forge(attributes);
  }

  static fromModel(model) {
    return _.get(model, ['nativeId'], model);
  }

  static assertOperator(operator, ...args) {
    const { hasOperator } = this;
    if (!hasOperator) return [null, operator, ...args];
    assertResult(operator, new Error('operator is required'));
    return [this.fromModel(operator), ...args];
  }

  [Symbol.toStringTag] = 'Model';

  [Symbol.toPrimitive](hint) {
    if (hint === 'number') return Number.NaN;
    return this.toString();
  }

  constructor() {
    this.initialize();
    const handler = _.pick(this.constructor, [
      'get', 'set', 'has', 'ownKeys', 'getOwnPropertyDescriptor',
    ]);
    return new Proxy(this, handler);
  }

  initialize() {
    this._ = {};
    this.current = {};
    this.previous = {};
  }

  get isNew() {
    const { idAttribute } = this.constructor;
    return !this[idAttribute];
  }

  get values() {
    return { ...this.previous, ...this.current };
  }

  get(paths) {
    const { values } = this;
    return _.get(values, paths, null);
  }

  set(paths, value) {
    _.set(this.current, paths, value);
  }

  valueOf(name) {
    if (name) return _.get(this.current, [name], this.previous[name]);

    const { idAttribute } = this.constructor;
    const id = this.valueOf(idAttribute);
    return id ? String(id) : id;
  }

  toString() {
    const { idAttribute } = this.constructor;
    return this[idAttribute];
  }

  clone(options) {
    const model = new this.constructor({}, options);
    model.current = _.cloneDeep(this.current);
    model.previous = this.previous;
    return model;
  }

  forge(attributes) {
    return invokeNull((attrs) => {
      const values = attrs.previous || Object(attrs);
      this.current = _.cloneDeep(values);
      this.previous = values;
      return this;
    }, attributes);
  }

  merge(attributes) {
    return invokeNull((attrs) => {
      const { format } = this.constructor;
      const values = format(Object(attrs));
      _.forEach([this.current, this.previous], data => _.assign(data, values));
      return this;
    }, attributes);
  }
}

export default fp.compose(
  withArrayMutator,
  withJSONMutator,
  withIncrementer,
  withSearcher,
  withDefaultValues,
  withCache,
  withLoader,
  withFetcher,
  withMutator,
  withBatch,
  withBuilder,
  withColumn,
  withGlobalId,
)(Model);
