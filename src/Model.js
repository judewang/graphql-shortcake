/* eslint no-param-reassign: ["error", { "ignorePropertyModificationsFor": ["target"] }] */
/* eslint no-underscore-dangle: ["error", { "allow": ["_columns", "__columns"] }] */

import _ from 'lodash';
import { thunk } from 'thelper';
import { PrimaryKeyColumn, DateTimeColumn, ValueColumn } from './columns';

export default class Model {
  static database = null;

  static tableName = null;

  static viewName = null;

  static idAttribute = 'id';

  static hasOperator = false;

  static hasTimestamps = true;

  static softDelete = true;

  static _columns = thunk({});

  static get(target, name) {
    return target[name];
  }

  static set(target, name, value) {
    target[name] = value;
  }

  static get displayName() {
    return this.name;
  }

  static set columns(columns) {
    this._columns = thunk(columns);
  }

  static get columns() {
    if (this.__columns) return this.__columns;

    const columns = this._columns();

    const {
      idAttribute, hasOperator, hasTimestamps, softDelete,
    } = this;

    this.__columns = _.defaults(
      columns,
      _.set({}, idAttribute, new PrimaryKeyColumn()),
      hasTimestamps && {
        createdAt: new DateTimeColumn(),
        updatedAt: new DateTimeColumn(),
      }, softDelete && {
        deletedAt: new DateTimeColumn(),
      }, hasOperator && hasTimestamps && {
        createdBy: new ValueColumn(),
        updatedBy: new ValueColumn(),
      }, hasOperator && softDelete && {
        deletedBy: new ValueColumn(),
      },
    );

    return this.__columns;
  }

  static refreshView = _.debounce(() => {
    this.raw(`REFRESH MATERIALIZED VIEW ${this.viewName};`);
  }, 500, { maxWait: 2000 });

  static raw(...args) {
    return this.database.raw(...args);
  }

  static format(data) {
    return _.mapKeys(data, (value, key) => _.camelCase(key));
  }

  static signify(column) {
    if (_.isPlainObject(column)) {
      return _.mapKeys(column, (value, key) => _.snakeCase(key));
    }
    if (_.isArray(column)) return _.map(column, _.snakeCase);
    if (_.isString(column)) return _.snakeCase(column);
    return column;
  }

  static forge(attributes, options) {
    const model = new this({}, options);
    return model.forge(attributes);
  }

  static fromModel(model) {
    return _.get(model, ['nativeId'], model);
  }

  static checkOperator(operator) {
    const { hasOperator } = this;
    if (!hasOperator) return null;
    if (!operator) throw new Error('operator is required');
    return this.fromModel(operator);
  }

  _ = {
    current: {},
    previous: {},
  }

  constructor(attrs) {
    const { columns, get, set } = this.constructor;

    const properties = _.mapValues(columns, (column, name) => {
      if (!column.name) column.name = name; // eslint-disable-line
      return {
        enumerable: column.enumerable,
        set: value => column.set(value, this._.current, this),
        get: () => column.get(this._.current, this),
      };
    });
    Object.defineProperties(this, properties);

    if (attrs) this.set(attrs);

    return new Proxy(this, { get, set });
  }

  get isNew() {
    const { idAttribute } = this.constructor;
    return !this[idAttribute];
  }

  get nativeId() {
    const { idAttribute } = this.constructor;
    return this.valueOf(idAttribute);
  }

  valueOf(name) {
    const values = { ...this.previous, ...this._.current };
    if (name) return values[name];
    return values;
  }

  set(data) {
    const { columns } = this.constructor;
    _.forEach(data, (value, key) => {
      if (columns[key] && value !== undefined) this[key] = value;
    });
    return this;
  }

  clone(options) {
    const model = new this.constructor({}, options);
    model._.current = _.cloneDeep(this._.current);
    model._.previous = this._.previous;
    return model;
  }

  forge(attributes) {
    const attrs = _.get(attributes, ['_', 'previous'], attributes);
    this._.current = _.cloneDeep(attrs);
    this._.previous = attrs;
    return this;
  }

  merge(attributes) {
    const { format } = this.constructor;
    const values = format(attributes);
    _.forEach([this._.current, this._.previous], data => _.assign(data, values));

    return this;
  }
}
