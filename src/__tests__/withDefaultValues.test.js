import { client } from 'knex';
import database from './database';
import Model from '..';

class DefaultValues extends Model {
  static database = database;

  static tableName = 'fetcher';

  static hasOperator = true;

  static defaultValues = {
    name: 'go car',
  }

  static columns = {
    name: { type: String },
  }
}

describe('DefaultValues', () => {
  beforeAll(async () => {
    await database.schema.dropTableIfExists('fetcher');

    await database.schema.createTable('fetcher', (table) => {
      table.increments();
      table.string('name');
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('deleted_at');
      table.integer('deleted_by');
    });
  });

  it('save use default values', async () => {
    const model = new DefaultValues();
    await model.save(10);
    expect(model.name).toBe('go car');
    expect(client).toMatchSnapshot();
    expect(client).toHaveBeenCalledTimes(1);
  });

  it('batch insert use default values', async () => {
    await DefaultValues.batchInsert([{}], 10);
    await expect(DefaultValues.load(2))
      .resolves.toEqual(expect.objectContaining({ name: 'go car' }));
  });
});
