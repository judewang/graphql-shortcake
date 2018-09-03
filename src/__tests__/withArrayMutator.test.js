import { client } from 'knex';
import database from './database';
import Model from '..';

class ArrayMutator extends Model {
  static database = database;

  static tableName = 'arraymutator';

  static hasOperator = true;

  static columns = {
    name: { type: String },
    userIds: { type: [String] },
  }
}

describe('ArrayMutator', () => {
  beforeAll(async () => {
    await database.schema.dropTableIfExists('arraymutator');

    await database.schema.createTable('arraymutator', (table) => {
      table.increments();
      table.string('name');
      table.specificType('user_ids', 'bigint[]');
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('deleted_at');
      table.integer('deleted_by');
    });

    await new ArrayMutator().insert({ name: 'herbivore' });
    await new ArrayMutator().insert({ name: 'apple', userIds: ['20', '10'] });
  });

  it('appendValue', async () => {
    const model = await ArrayMutator.load(1);

    await model.appendValue('userIds', '10', 10);
    expect(model.userIds).toEqual(['10']);

    await model.appendValue('userIds', '20', 10);
    expect(model.userIds).toEqual(['10', '20']);

    await model.appendValue('userIds', '10', 10);
    expect(model.userIds).toEqual(['20', '10']);
    await expect(ArrayMutator.load(1))
      .resolves.toEqual(expect.objectContaining({ userIds: ['20', '10'] }));

    expect(client).toMatchSnapshot();
    expect(client).toHaveBeenCalledTimes(5);
  });

  it('removeValue', async () => {
    const model = await ArrayMutator.load(2);

    await model.removeValue('userIds', '10', 10);
    expect(model.userIds).toEqual(['20']);

    await expect(ArrayMutator.load(2))
      .resolves.toEqual(expect.objectContaining({ userIds: ['20'] }));

    expect(client).toMatchSnapshot();
  });
});
