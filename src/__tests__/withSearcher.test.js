import { client } from 'knex';
import _ from 'lodash';
import database from './database';
import Model from '..';

class Searcher extends Model {
  static database = database;

  static tableName = 'searcher';

  static toKeyword = data => data.name;

  static columns = {
    name: { type: String },
  }
}

describe('Searcher', () => {
  beforeAll(async () => {
    await database.schema.dropTableIfExists('searcher');

    await database.schema.createTable('searcher', (table) => {
      table.increments();
      table.string('name');
      table.specificType('keyword', 'tsvector');
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('deleted_at');
      table.integer('deleted_by');
    });
  });

  it('insert', async () => {
    await new Searcher({ name: 'green tea pudding' }).save('10');
    await new Searcher({ name: 'cheese cake' }).save('10');
    await new Searcher({ name: 'green tea pie' }).save('10');
    await new Searcher({ name: 'american cheese cake' }).save('10');
    await new Searcher({ name: 'pumpkin pie' }).save('10');
    expect(client).toMatchSnapshot();
    expect(client).toHaveBeenCalledTimes(5);
  });

  it('update', async () => {
    const searcher = await Searcher.load(4);
    searcher.name = 'apple cheese cake';
    await searcher.save();
    expect(client).toMatchSnapshot();
    expect(client).toHaveBeenCalledTimes(2);
  });

  it('search', async () => {
    const model = new Searcher();
    model.search('green pie');
    const results = await model.fetchAll();
    expect(results.totalCount).toBe(3);
    expect(_.map(results, 'name')).toEqual([
      'green tea pie', 'green tea pudding', 'pumpkin pie',
    ]);
  });

  it('search use & logic', async () => {
    const model = new Searcher();
    model.search('green & pie');
    const results = await model.fetchAll();
    expect(results.totalCount).toBe(1);
    expect(_.map(results, 'name')).toEqual(['green tea pie']);
  });
});
