/* eslint no-underscore-dangle: ["error", { "allow": ["_columns"] }] */
import _ from 'lodash';
import {
  thunk, assertResult, invokeMapKeys, invokeNull,
} from 'thelper';
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
    return invokeMapKeys(_.camelCase, data);
  }

  static signify(data) {
    return invokeMapKeys(_.snakeCase, data);
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
      assertResult(type, new TypeError(`[${this.displayName}] ${key} type of column is required`));
      const Type = type[0] || type;
      const isArray = _.isArray(type);
      const toType = bindType(Type);
      const toValue = value => invokeNull(v => toType(v).valueOf(), value);

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
    const { toType, paths } = columns[name];
    const value = super.get(paths);

    if (_.isNil(value)) return null;
    return toType(value);
  }

  set(name, data) {
    if (typeof name === 'object') {
      _.forEach(name, (value, key) => { this.set(key, value); });
      return this;
    }

    const { idAttribute } = this.constructor;
    if (name === idAttribute) {
      this.id = data;
      return this;
    }

    const { columns } = this;
    if (!columns[name]) return this;
    const { toValue, paths } = columns[name];
    super.set(paths, invokeNull(toValue, data));
    return this;
  }
};
