import { client } from 'knex';
import database from './database';
import Model from '..';

class Incrementer extends Model {
  static database = database;

  static tableName = 'incrementer';

  static hasOperator = true;

  static columns = {
    name: { type: String },
    total: { type: Number },
  }
}

describe('Incrementer', () => {
  beforeAll(async () => {
    await database.schema.dropTableIfExists('incrementer');

    await database.schema.createTable('incrementer', (table) => {
      table.increments();
      table.string('name');
      table.integer('total');
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('deleted_at');
      table.integer('deleted_by');
    });

    await new Incrementer().insert({ name: 'herbivore', total: 0 });
    await new Incrementer().insert({ name: 'ant', total: 0 });
  });

  it('single', async () => {
    const model = await Incrementer.load(1);
    expect(model.total).toBe(0);

    await model.increment('total', 10);
    expect(model.total).toBe(10);
    expect((await Incrementer.load(1)).total).toBe(10);

    await model.increment('total', -5);
    expect(model.total).toBe(5);

    expect(client).toMatchSnapshot();
  });

  it('multiple', async () => {
    const model = await Incrementer.load(2);
    expect(model.total).toBe(0);

    await model.increment({ total: 10 });
    expect(model.total).toBe(10);

    expect((await Incrementer.load(2)).total).toBe(10);
    await model.increment({ total: -5 });

    expect(model.total).toBe(5);

    expect(client).toMatchSnapshot();
  });
});
