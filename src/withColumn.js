/* eslint no-underscore-dangle: ["error", { "allow": ["_columns"] }] */
import _ from 'lodash';
import { thunk, assertResult } from 'thelper';
import { DateTime } from './columns';

const bindType = (Type) => {
  const isNative = [Boolean, String, Number, Object].indexOf(Type) > -1;
  return isNative ? value => Type(value) : value => new Type(value);
};

const bindMap = (handler, isArray) => {
  if (isArray) return values => _.map(values, handler);
  return value => handler(value);
};

export default Parent => class Column extends Parent {
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

  static _columns = thunk({});

  static set columns(value) {
    this._columns = thunk(value);
  }

  static get columns() {
    if (typeof this._columns === 'object') return this._columns;

    const { hasOperator, hasTimestamps, softDelete } = this;

    const columns = _.defaults(
      this._columns(),
      hasTimestamps && {
        createdAt: { type: DateTime },
        updatedAt: { type: DateTime },
      }, softDelete && {
        deletedAt: { type: DateTime },
      }, hasOperator && hasTimestamps && {
        createdBy: { type: String },
        updatedBy: { type: String },
      }, hasOperator && softDelete && {
        deletedBy: { type: String },
      },
    );

    this._columns = _.mapValues(columns, ({ type, paths, name }, key) => {
      assertResult(type, new TypeError(`${key} type of column is required`));
      const Type = type[0] || type;
      const isArray = _.isArray(type);
      const toType = bindType(Type);
      const toValue = value => (_.isNil(value) ? null : toType(value).valueOf());

      return {
        type: Type,
        paths: (paths || []).concat(name || key),
        isArray,
        toType: bindMap(toType, isArray),
        toValue: bindMap(toValue, isArray),
      };
    });

    return this._columns;
  }

  constructor(attr, ...args) {
    const model = super(attr, ...args);

    if (attr instanceof Parent) {
      this.forge(attr);
    } else if (_.isPlainObject(attr)) {
      this.set(attr);
    } else if (attr) {
      this.id = attr;
    }

    return model;
  }

  initialize() {
    super.initialize();
    const { idAttribute, columns } = this.constructor;
    this.columns = columns;
    this.ownKeys = [idAttribute, ...Reflect.ownKeys(columns)];
  }

  set id(value) {
    const { idAttribute } = this.constructor;
    this.current[idAttribute] = this.constructor.fromGlobalId(value);
  }

  get id() {
    const id = this.valueOf();
    return id ? this.constructor.toGlobalId(id) : null;
  }

  get nativeId() {
    return this.valueOf();
  }

  get(name) {
    const { idAttribute } = this.constructor;
    if (name === idAttribute) return this.id;

    const { columns } = this;
    if (!columns[name]) return undefined;

    const { toType, paths } = columns[name];
    const value = super.get(paths);

    if (_.isNil(value)) return null;
    return toType(value);
  }

  set(name, data) {
    if (typeof name === 'object') {
      _.forEach(name, (value, key) => { this.set(key, value); });
      return;
    }

    const { idAttribute } = this.constructor;
    if (name === idAttribute) {
      this.id = data;
      return;
    }

    const { columns } = this;
    if (!columns[name]) return;
    const { toValue, paths } = columns[name];
    super.set(paths, _.isNil(data) ? null : toValue(data));
  }
};