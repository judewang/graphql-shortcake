import _ from 'lodash';
import { client } from 'knex';
import database from './database';
import Model from '..';

class Builder extends Model {
  static database = database;

  static tableName = 'builder';

  static columns = {
    name: { type: String },
    price: { type: Number },
  }
}

class BuilderView extends Builder {
  static database = database;

  static viewName = 'builder_view';

  static columns = {
    name: { type: String },
    double: { type: Number },
  }
}

describe('Builder', () => {
  beforeAll(async () => {
    await database.raw('DROP VIEW IF EXISTS builder_view');
    await database.schema.dropTableIfExists('builder');

    await database.schema.createTable('builder', (table) => {
      table.increments();
      table.string('name');
      table.integer('price');
      table.boolean('enable');
      table.timestamps();
      table.timestamp('deleted_at');
      table.integer('created_by');
      table.integer('updated_by');
      table.integer('deleted_by');
    });

    await database.raw('CREATE VIEW builder_view AS SELECT id, price * 2 as double FROM builder');

    await new Builder().insert({ name: 'apple', price: 10 });
    await new Builder().insert({ name: 'banana', price: 20 });
  });

  it('static mutate', () => {
    expect(Builder.mutate.toString()).toBe('select * from "builder"');
    expect(BuilderView.mutate.toString()).toBe('select * from "builder"');
  });

  it('static query', () => {
    expect(Builder.query.toString()).toBe('select * from "builder"');
    expect(BuilderView.query.toString()).toBe('select * from "builder"');
  });

  it('toSQL', () => {
    const model = new Builder();
    expect(model.toSQL().sql).toBe('select id from "builder" where deleted_at IS NULL');
  });

  describe('table & view', () => {
    it('only table', async () => {
      expect(_.map(await new Builder().fetchAll(), 'price')).toEqual([10, 20]);
      expect(client).toMatchSnapshot();
    });

    it('table with view', async () => {
      expect(_.map(await new BuilderView().fetchAll(), 'double')).toEqual([20, 40]);
      expect(client).toMatchSnapshot();
    });
  });

  describe('join', () => {
    it('innerJoin', async () => {
      const model = new Builder();
      model.join('builder_view', 'builder.id', 'builder_view.id');

      const { builder } = model;
      await expect(Builder.exec(builder)).resolves.toMatchSnapshot();
      expect(builder).toMatchSnapshot();
      expect(client).toMatchSnapshot();
    });
  });

  describe('where', () => {
    it('where & orWhere', async () => {
      const model = new Builder();
      model.where('name', 'apple');
      model.orWhere('name', 'banana');

      const { builder } = model;
      await expect(Builder.exec(builder)).resolves.toMatchSnapshot();
      expect(builder).toMatchSnapshot();
      expect(client).toMatchSnapshot();
    });

    it('whereIn & orWhereIn', async () => {
      const model = new Builder();
      model.whereIn('id', [1, 2, 3]);
      model.whereNotIn('id', [4, 5, 6]);
      model.orWhereIn('price', [10, 20, 30]);
      model.orWhereNotIn('price', [40, 50, 60]);

      const { builder } = model;
      await expect(Builder.exec(builder)).resolves.toMatchSnapshot();
      expect(builder).toMatchSnapshot();
      expect(client).toMatchSnapshot();
    });

    it('whereIn with Model', async () => {
      const model = new Builder();

      const whereIn = new Builder({ price: 20 });
      model.whereIn('id', whereIn.toSQL());

      const { builder } = model;
      await expect(Builder.exec(builder)).resolves.toMatchSnapshot();
      expect(builder).toMatchSnapshot();
      expect(client).toMatchSnapshot();
    });

    it('whereNull & orWhereNull', async () => {
      const model = new Builder();
      model.whereNull('name');
      model.whereNotNull('name');
      model.orWhereNull('price');
      model.orWhereNotNull('price');

      const { builder } = model;
      await expect(Builder.exec(builder)).resolves.toMatchSnapshot();
      expect(builder).toMatchSnapshot();
      expect(client).toMatchSnapshot();
    });

    it('whereBetween & whereNotBetween', async () => {
      const model = new Builder();
      model.whereBetween('price', [10, 20]);
      model.whereNotBetween('price', [15, 16]);
      model.orWhereBetween('price', [40, 50]);
      model.orWhereNotBetween('price', [45, 46]);

      const { builder } = model;
      await expect(Builder.exec(builder)).resolves.toMatchSnapshot();
      expect(builder).toMatchSnapshot();
      expect(client).toMatchSnapshot();
    });

    it('whereRaw', async () => {
      const model = new Builder();
      model.whereRaw('enable IS TRUE');
      model.orWhereRaw('enable IS FALSE');
      model.where('price', '>', 666);
      model.where('price', '!=', 999);

      const { builder } = model;
      await expect(Builder.exec(builder)).resolves.toMatchSnapshot();
      expect(builder).toMatchSnapshot();
      expect(client).toMatchSnapshot();
    });
  });

  it('groupBy', async () => {
    const model = new Builder();
    model.groupBy('id');
    model.groupBy('name');
    const { builder } = model;
    await expect(Builder.exec(builder)).resolves.toMatchSnapshot();
    expect(client).toMatchSnapshot();
  });

  it('orderByAsc & orderByDesc', async () => {
    const model = new Builder();
    model.orderByAsc('id');
    model.orderByDesc('price', 'LAST');
    const { builder } = model;
    await expect(Builder.exec(builder)).resolves.toMatchSnapshot();
    expect(client).toMatchSnapshot();
  });

  it('limit & offset', () => {
    const model = new Builder();
    model.limit(10).offset(100);
    expect(model.limit()).toBe(10);
    expect(model.offset()).toBe(100);
  });
});
