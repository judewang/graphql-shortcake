import { client } from 'knex';
import database from './database';
import Model from '..';

class Loader extends Model {
  static database = database;

  static tableName = 'loader';

  static hasOperator = true;

  static columns = {
    name: { type: String },
  }
}

describe('Loader', () => {
  beforeAll(async () => {
    await database.schema.dropTableIfExists('loader');

    await database.schema.createTable('loader', (table) => {
      table.increments();
      table.string('name');
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('deleted_at');
      table.integer('deleted_by');
    });

    await new Loader().insert({ name: 'herbivore' });
    await new Loader().insert({ name: 'ant' });
  });

  it('load', async () => {
    expect(await Loader.load(1))
      .toEqual(expect.objectContaining({ name: 'herbivore' }));
    expect(client).toMatchSnapshot();
    expect(client).toHaveBeenCalledTimes(1);
  });

  it('loadMany', async () => {
    const results = await Promise.all([
      Loader.load(1), Loader.loadMany([1, 2]),
    ]);

    expect(results).toEqual([
      expect.objectContaining({ name: 'herbivore' }),
      [expect.objectContaining({ name: 'herbivore' }), expect.objectContaining({ name: 'ant' })],
    ]);

    expect(client).toMatchSnapshot();
    expect(client).toHaveBeenCalledTimes(1);
  });

  it('when not found', async () => {
    await expect(Loader.load())
      .resolves.toBe(null);
    await expect(Loader.load(99))
      .resolves.toEqual(null);
    await expect(Loader.load(99, Error))
      .rejects.toEqual(new Error());
    await expect(Loader.loadMany([99]))
      .resolves.toEqual([null]);
    await expect(Loader.loadMany([99], Error))
      .rejects.toEqual(new Error());
    expect(client).toHaveBeenCalledTimes(4);
  });

  it('when soft delete', async () => {
    const model = await Loader.load(1);
    await model.destroy(10);
    await expect(Loader.load(1)).resolves.toEqual(null);
    expect(client).toMatchSnapshot();
    expect(client).toHaveBeenCalledTimes(3);
  });
});
