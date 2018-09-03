import { client } from 'knex';
import database from './database';
import Model from '..';

class Mutator extends Model {
  static database = database;

  static tableName = 'mutator';

  static hasOperator = true;

  static columns = {
    name: { type: String },
  }
}

class Logger extends Mutator {
  static hasOperator = false;

  static hasTimestamps = false;
}

class Cache extends Mutator {
  static softDelete = false;

  static hasOperator = false;

  static hasTimestamps = false;
}

describe('Mutator', () => {
  beforeAll(async () => {
    await database.schema.dropTableIfExists('mutator');

    await database.schema.createTable('mutator', (table) => {
      table.increments();
      table.string('name');
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('deleted_at');
      table.integer('deleted_by');
    });
  });

  describe('sent insert of save', () => {
    it('has operator', async () => {
      const model = new Mutator({ name: 'new is insert' });
      expect(model.values).toEqual({ name: 'new is insert' });
      await model.save(10);
      expect(model.values).toEqual(expect.objectContaining({
        createdAt: expect.anything(Date),
        createdBy: 10,
        updatedAt: expect.anything(Date),
        updatedBy: 10,
      }));
      expect(client).toMatchSnapshot();

      await expect(new Mutator().save())
        .rejects.toEqual(new Error('operator is required'));
    });

    it('no operator', async () => {
      const model = new Cache({ name: 'new is no operator insert' });
      await model.save();
      expect(model.values).toEqual(expect.objectContaining({
        createdAt: null,
        createdBy: null,
        updatedAt: null,
        updatedBy: null,
      }));
      expect(client).toMatchSnapshot();
    });
  });

  describe('sent update of save', async () => {
    it('has operator', async () => {
      const model = await Mutator.load(1);

      model.name = 'name is update';
      await model.save(20);
      await model.save(20);

      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(2);

      model.set({ name: 'update again' });
      await expect(model.save())
        .rejects.toEqual(new Error('operator is required'));
    });

    it('no operator', async () => {
      const model = await Cache.load(2);
      model.set({ name: 'name is no operator update' });
      await model.save();
      expect(client).toMatchSnapshot();
    });
  });

  describe('destroy', () => {
    it('has operator', async () => {
      const model = await Mutator.load(1);

      await model.destroy(10);
      await model.destroy(10);
      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(2);

      await expect(model.destroy())
        .rejects.toEqual(new Error('operator is required'));
    });

    it('no operator and no soft delete', async () => {
      const model = await Cache.load(2);
      await model.destroy();
      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(2);
    });

    it('no operator', async () => {
      const model = new Logger({ name: 'new logger' });
      await model.save();
      await model.destroy();
      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(2);
    });
  });
});
