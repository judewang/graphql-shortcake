import _ from 'lodash';
import { client } from 'knex';
import database from './database';
import Model from '..';

class Fetcher extends Model {
  static database = database;

  static tableName = 'fetcher';

  static hasOperator = true;

  static columns = {
    name: { type: String },
    data: { type: Object },
  }
}

describe('Fetcher', () => {
  beforeAll(async () => {
    await database.schema.dropTableIfExists('fetcher');

    await database.schema.createTable('fetcher', (table) => {
      table.increments();
      table.string('name');
      table.jsonb('data');
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('deleted_at');
      table.integer('deleted_by');
    });

    await new Fetcher().insert({ name: 'pineapple shortcake' });
    await new Fetcher().insert({ name: 'banana' });
  });

  describe('fetch', () => {
    it('fetch one', async () => {
      const model = new Fetcher({
        name: 'pineapple shortcake',
        data: { xyz: 1 },
      });
      await model.fetch();
      expect(model.values).toMatchSnapshot();
      expect(client).toMatchSnapshot();

      await expect((new Fetcher({ name: 'shortcake' })).fetch())
        .resolves.toEqual(null);
      await expect((new Fetcher({ name: 'shortcake' })).fetch(Error))
        .rejects.toEqual(new Error());
    });

    it('with where', async () => {
      const model = new Fetcher();
      model.where({ name: 'banana' });
      model.orderByAsc('createdAt');
      model.whereNull('data');
      await model.fetch();
      expect(model.values).toMatchSnapshot();
      expect(client).toMatchSnapshot();
    });
  });

  describe('fetchAll', () => {
    it('successfully fetch', async () => {
      const fetcher = new Fetcher({ name: 'banana' });

      const results = await fetcher.fetchAll();
      expect(results.totalCount).toBe(1);
      expect(results.offset).toBe(null);
      expect(results.limit).toBe(null);
      expect(_.map(results, 'name')).toEqual(['banana']);
      expect(client).toMatchSnapshot();
    });

    it('when not found', async () => {
      const fetcher = new Fetcher({ name: 'apple' });

      await expect(fetcher.fetchAll())
        .resolves.toEqual(Object.assign([], { totalCount: 0, offset: null, limit: null }));
      await expect(fetcher.fetchAll(Error))
        .rejects.toEqual(new Error());
    });
  });

  describe('fetchPage', () => {
    it('offset and first', async () => {
      const fetcher = new Fetcher();
      const results = await fetcher.fetchPage({ offset: 1, first: 2 });
      expect(results).toEqual(expect.objectContaining({ totalCount: 2, offset: 1, limit: 2 }));
      expect(_.map(results, 'name')).toEqual(['banana']);
      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(1);
    });

    it('not set', async () => {
      const model = new Fetcher();
      const results = await model.fetchPage();
      expect(results.totalCount).toBe(2);
      expect(results).toEqual(expect.objectContaining({ totalCount: 2, offset: 0, limit: 1000 }));
      expect(_.map(results, 'name')).toEqual(['pineapple shortcake', 'banana']);
      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchCount', () => {
    it('successfully fetch', async () => {
      const fetcher = new Fetcher({ name: 'pineapple shortcake' });
      await expect(fetcher.fetchCount()).resolves.toBe(1);
      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(1);
    });

    it('not found', async () => {
      const fetcher = new Fetcher({ name: 'cherry' });
      await expect(fetcher.fetchCount(Error))
        .rejects.toEqual(new Error());
    });
  });
});
