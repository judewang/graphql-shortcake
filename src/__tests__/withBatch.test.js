import _ from 'lodash';
import database from './database';
import Model from '..';

class Batch extends Model {
  static database = database;

  static tableName = 'batch';

  static hasOperator = true;

  static columns = {
    name: { type: String },
  }
}

class Logger extends Batch {
  static hasOperator = false;

  static hasTimestamps = false;
}

class Cache extends Batch {
  static softDelete = false;

  static hasOperator = false;

  static hasTimestamps = false;
}

describe('Batch', () => {
  beforeAll(async () => {
    await database.schema.dropTableIfExists('batch');

    await database.schema.createTable('batch', (table) => {
      table.increments();
      table.string('name');
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('deleted_at');
      table.integer('deleted_by');
    });
  });

  describe('insert', () => {
    const rows = _.map(_.range(1, 10000), idx => ({ name: `x${idx}` }));
    it('successfully insert', async () => {
      const results = await Cache.batchInsert(rows);
      expect(results.length).toBe(9999);
    });

    it('successfully insert with operator', async () => {
      const results = await Batch.batchInsert(rows, 99);
      expect(results.length).toBe(9999);
    });

    it('operator is required', async () => {
      await expect(Batch.batchInsert(rows))
        .rejects.toEqual(new Error('operator is required'));
    });
  });

  describe('update', () => {
    const rows = ['1', '3', '5'];
    it('successfully update', async () => {
      await Cache.batchUpdate(rows, { name: 'cupcake' });
      await expect(Cache.loadMany(rows)).resolves.toMatchSnapshot();
    });

    it('successfully update with operator', async () => {
      await Batch.batchUpdate(rows, { name: 'tiramisu' }, 99);
      await expect(Batch.loadMany(rows)).resolves.toMatchSnapshot();
    });

    it('operator is required', async () => {
      await expect(Batch.batchUpdate(rows, { name: 'sweets' }))
        .rejects.toEqual(new Error('operator is required'));
    });
  });

  describe('destroy', () => {
    it('successfully destory', async () => {
      const rows = ['1', '3', '5'];
      await Cache.batchDestroy(rows);
      await expect(Cache.loadMany(rows))
        .resolves.toEqual([null, null, null]);
    });

    it('successfully destory with disable soft delete', async () => {
      const rows = ['2', '4', '6'];
      await Logger.batchDestroy(rows, 99);
      await expect(Logger.loadMany(rows))
        .resolves.toEqual([null, null, null]);
    });

    it('successfully destory with operator', async () => {
      const rows = ['7', '8', '9'];
      await Batch.batchDestroy(rows, 99);
      await expect(Batch.loadMany(rows))
        .resolves.toEqual([null, null, null]);
    });

    it('operator is required', async () => {
      await expect(Batch.batchDestroy(['16']))
        .rejects.toEqual(new Error('operator is required'));
    });
  });
});
