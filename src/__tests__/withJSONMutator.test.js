import { client } from 'knex';
import database from './database';
import Model from '..';

class JSONMutator extends Model {
  static database = database;

  static tableName = 'jsonmutator';

  static hasOperator = true;

  static columns = {
    name: { type: String },
    data: { type: Object },
  }
}

describe('JSONMutator', () => {
  beforeAll(async () => {
    await database.schema.dropTableIfExists('jsonmutator');

    await database.schema.createTable('jsonmutator', (table) => {
      table.increments();
      table.string('name');
      table.jsonb('data');
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('deleted_at');
      table.integer('deleted_by');
    });

    await new JSONMutator().insert({ name: 'herbivore' });
  });

  it('addKeyValue', async () => {
    const model = await JSONMutator.load(1);
    expect(model.data).toBe(null);
    await model.addKeyValue('data', '10', 'xyz', 10);
    expect(model.data).toEqual({ 10: 'xyz' });

    expect(client).toMatchSnapshot();
    expect(client).toHaveBeenCalledTimes(2);
  });

  it('delKeyValue', async () => {
    const model = await JSONMutator.load(1);

    expect(model.data).toEqual({ 10: 'xyz' });
    await model.delKeyValue('data', '10', 10);
    expect(model.data).toEqual({});

    expect(client).toMatchSnapshot();
    expect(client).toHaveBeenCalledTimes(2);
  });
});
