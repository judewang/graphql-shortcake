import _ from 'lodash';
import { assertResult } from 'thelper';
import RawSQL from './RawSQL';

const whereSQL = {
  '=': (column, value) => (
    _.isNil(value) ? [`${column} IS NULL`] : [`${column} = ?`, [value]]
  ),
  '!=': (column, value) => (
    _.isNil(value) ? [`${column} IS NOT NULL`] : [`${column} != ?`, [value]]
  ),
  IN: (column, value) => [`${column} = ANY(?)`, [value]],
  'NOT IN': (column, value) => [`${column} != ANY(?)`, [value]],
  BETWEEN: (column, value) => [`${column} BETWEEN ? AND ?`, value],
  'NOT BETWEEN': (column, value) => [`${column} NOT BETWEEN ? AND ?`, value],
};

const invokeWhere = (column, operator, value) => {
  if (whereSQL[operator]) {
    return whereSQL[operator](column, value);
  }

  return [`${column} ${operator} ?`, value];
};

export default (Parent) => {
  class Builder extends Parent {
    static get mutate() {
      return this.database(this.tableName);
    }

    static get query() {
      return this.database(this.tableName);
    }

    static exec(builder, values) {
      const { idAttribute, softDelete, database: pool } = this;
      const {
        method, table, view, join,
        select, where, orderBy, groupBy,
        limit, offset,
      } = builder;

      const sql = pool(table);

      if (method === 'insert') {
        return sql.insert(this.signify(values), '*');
      }

      sql.where((subsql) => {
        _.forEach(where, ({
          column, operator, value, or,
        }) => {
          const name = or ? 'orWhereRaw' : 'andWhereRaw';
          if (column instanceof RawSQL) {
            subsql[name](pool.raw(...column.valueOf()));
            return;
          }
          subsql[name](...invokeWhere(this.signify(column), operator, value));
        });
      });
      _.forEach(orderBy, ({ column, direction, nulls }) => {
        const raw = [this.signify(column), direction];
        const nullsSQL = { FIRST: 'NULLS FIRST', LAST: 'NULLS LAST' };
        if (nullsSQL[nulls]) raw.push(nullsSQL[nulls]);
        sql.orderByRaw(raw.join(' '));
      });
      if (limit) sql.limit(limit);
      if (offset) sql.offset(offset);
      if (softDelete) sql.whereRaw('deleted_at IS NULL');

      if (method === 'delete') return sql.delete();
      if (method === 'update') return sql.update(this.signify(values)).returning('*');

      if (_.size(groupBy)) sql.groupBy(...groupBy);

      if (view) {
        const id = this.signify(idAttribute);
        sql.leftJoin(view, `${table}.${id}`, `${view}.${id}`);
      }
      _.forEach(join, ({ table: joinTable, direction, relationalKeys }) => {
        const name = `${direction}Join`;
        if (joinTable instanceof RawSQL) {
          sql.joinRaw(...joinTable.valueOf());
          return;
        }
        sql[name](joinTable, ...relationalKeys);
      });
      return sql.select(_.map(select, item => pool.raw(item)));
    }

    initialize() {
      super.initialize();
      this.resetBuilder();
    }

    resetBuilder() {
      const { tableName, viewName } = this.constructor;
      this.builderTasks = {
        select: ['*'],
        table: tableName,
        view: viewName,
        join: [],
        where: [],
        orderBy: [],
        groupBy: [],
        offset: null,
        limit: null,
      };
    }

    get builder() {
      const {
        idAttribute, keywordAttribute, signify,
      } = this.constructor;

      const { values } = this;
      const id = values[idAttribute];
      if (id) {
        this.where(idAttribute, id);
      } else {
        const data = signify(values);
        delete data[keywordAttribute];

        _.forEach(data, (value, key) => {
          if (!_.isObject(value)) this.where(key, value);
        });
      }

      const { builderTasks } = this;
      this.resetBuilder();
      return builderTasks;
    }

    get limit() {
      return this.builderTasks.limit;
    }

    set limit(value) {
      this.builderTasks.limit = Number(value);
    }

    get offset() {
      return this.builderTasks.offset;
    }

    set offset(value) {
      this.builderTasks.offset = Number(value);
    }

    async exec(...args) {
      const results = await this.constructor.exec(...args);
      return _.map(results, this.constructor.format);
    }

    async find() {
      const { limit, offset } = this;

      if (limit !== 1) {
        this.select('count(*) OVER() AS total_count');
      }

      const { builder } = this;
      const collection = await this.exec(builder);

      const totalCount = Number(_.get(collection[0], ['totalCount'], 0));
      const results = _.map(collection, (data) => {
        _.unset(data, ['totalCount']);
        const model = this.constructor.forge(data);
        return model;
      });
      _.assign(results, { totalCount, limit, offset });
      return results;
    }

    async insert(values, error) {
      const { builder } = this;
      const [row] = await this.exec({ ...builder, method: 'insert' }, values);
      return assertResult(this.merge(row), error);
    }

    async update(changes, error) {
      const { builder } = this;
      const [row] = await this.exec({ ...builder, method: 'update' }, changes);
      return assertResult(this.merge(row), error);
    }

    async delete() {
      const { builder } = this;
      return this.exec({ ...builder, method: 'delete' });
    }
  }

  Builder.prototype.select = function queryBuilder(sql) {
    this.builderTasks.select.push(sql);
  };

  _.forEach(['join', 'innerJoin', 'leftJoin', 'rightJoin'], (name) => {
    Builder.prototype[name] = function queryBuilder(table, ...relationalKeys) {
      const [, direction] = /^(|inner|left|right)[jJ]oin$/.exec(name);
      this.builderTasks.join.push({
        table,
        direction: direction || 'inner',
        relationalKeys,
      });
      return this;
    };
  });

  _.forEach(['where', 'orWhere'], (name) => {
    Builder.prototype[name] = function queryBuilder(column, ...args) {
      if (_.isPlainObject(column)) {
        _.forEach(column, (value, key) => this[name](key, value));
        return this;
      }

      const or = Boolean(name[0] === 'o');
      const [operator, value] = _.isUndefined(args[1]) ? ['=', args[0]] : args;
      this.builderTasks.where.push({
        column, operator, value, or,
      });
      return this;
    };
  });

  _.forEach([
    'whereIn', 'whereNotIn', 'orWhereIn', 'orWhereNotIn',
    'whereNull', 'whereNotNull', 'orWhereNull', 'orWhereNotNull',
    'whereBetween', 'whereNotBetween', 'orWhereBetween', 'orWhereNotBetween',
  ], (name) => {
    Builder.prototype[name] = function queryBuilder(column, value = null) {
      const [, method, key] = /^(where|orWhere)(.*)$/.exec(name);
      const keys = { Null: '=', NotNull: '!=' };
      this[method](column, keys[key] || _.upperCase(key), value);
      return this;
    };
  });

  _.forEach(['orderByAsc', 'orderByDesc'], (name) => {
    Builder.prototype[name] = function queryBuilder(column, nulls) {
      const [, direction] = /^orderBy(Asc|Desc)$/.exec(name);
      this.builderTasks.orderBy.push({
        column, direction: _.toUpper(direction), nulls,
      });
      return this;
    };
  });

  Builder.prototype.groupBy = function queryBuilder(column) {
    this.builderTasks.groupBy.push(column);
  };

  _.forEach(['whereRaw', 'orWhereRaw', 'joinRaw'], (name) => {
    Builder.prototype[name] = function queryBuilder(...args) {
      const [, method] = /^(where|orWhere|join)Raw$/.exec(name);
      this[method](new RawSQL(...args));
    };
  });

  return Builder;
};
