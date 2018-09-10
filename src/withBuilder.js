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

    static toSQL(builder, values) {
      const {
        idAttribute,
        softDelete,
        signify,
        database: pool,
      } = this;
      const {
        method, table, view, join,
        select, where, orderBy, groupBy,
        limit, offset, skipLocked,
      } = builder;

      const sql = pool(table);
      const idColumn = signify(idAttribute);

      if (method === 'insert') {
        return sql.insert(signify(values), '*');
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
          subsql[name](...invokeWhere(signify(column), operator, value));
        });
      });
      _.forEach(orderBy, ({ column, direction, nulls }) => {
        const raw = [signify(column), direction];
        const nullsSQL = { FIRST: 'NULLS FIRST', LAST: 'NULLS LAST' };
        if (nullsSQL[nulls]) raw.push(nullsSQL[nulls]);
        sql.orderByRaw(raw.join(' '));
      });
      if (softDelete) sql.whereRaw('deleted_at IS NULL');

      if (limit) sql.limit(limit);
      if (offset) sql.offset(offset);

      if (method === 'delete') return sql.delete();
      if (method === 'update') {
        if (limit) {
          sql.select(idColumn);
          const forUpdate = `FOR UPDATE${skipLocked ? ' SKIP LOCKED' : ''}`;
          return pool(table)
            .whereRaw(`${idColumn} IN (${sql} ${forUpdate})`)
            .update(this.signify(values))
            .returning('*');
        }
        return sql.update(this.signify(values)).returning('*');
      }

      if (_.size(groupBy)) sql.groupBy(...groupBy);

      if (view) {
        sql.leftJoin(view, `${table}.${idColumn}`, `${view}.${idColumn}`);
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

    static async exec(...args) {
      return _.map(await this.toSQL(...args), this.format);
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
        skipLocked: false,
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

    limit(value) {
      if (_.isUndefined(value)) {
        return this.builderTasks.limit;
      }
      this.builderTasks.limit = Number(value);
      return this;
    }

    offset(value) {
      if (_.isUndefined(value)) {
        return this.builderTasks.offset;
      }
      this.builderTasks.offset = Number(value);
      return this;
    }

    toSQL() {
      const { builder } = this;
      return this.constructor.toSQL(builder);
    }

    async exec(...args) {
      const results = await this.constructor.exec(...args);
      return _.map(results, this.constructor.format);
    }

    async find() {
      const { builder } = this;
      const { limit, offset } = builder;

      if (limit !== 1) {
        builder.select.push('count(*) OVER() AS total_count');
      }

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
      builder.method = 'insert';
      const [row] = await this.constructor.exec(builder, values);
      return assertResult(this.merge(row), error);
    }

    async update(changes, error) {
      const { builder } = this;
      builder.method = 'update';
      const [row] = await this.constructor.exec(builder, changes);
      return assertResult(this.merge(row), error);
    }

    async delete() {
      const { builder } = this;
      builder.method = 'delete';
      return this.constructor.exec(builder);
    }
  }

  Builder.prototype.select = function queryBuilder(sql) {
    this.builderTasks.select.push(sql);
    return this;
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
      return this[method](new RawSQL(...args));
    };
  });

  Builder.prototype.skipLocked = function queryBuilder() {
    this.builderTasks.skipLocked = true;
    return this;
  };

  return Builder;
};
