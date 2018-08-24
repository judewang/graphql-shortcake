import knex, { client } from 'knex';
import _ from 'lodash';
import faker from 'faker';
import { NotFoundError } from 'graphql-tower-errors';
import Model, {
  ValueColumn, HashColumn, ListColumn,
  toGlobalId, fromGlobalId,
} from '..';

const database = knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    user: 'postgres',
    password: null,
    database: 'graphql_tower',
  },
});

class MainModel extends Model {
  static database = database;

  static tableName = 'model_table';

  static hasOperator = true;

  static toKeyword = data => data.name;

  static defaultValues = {
    name: 'go car',
  }

  static columns = {
    name: new ValueColumn(),
    nickName: new ValueColumn(),
    password: new HashColumn(),
    userIds: new ListColumn(),
    data: new ValueColumn(Object),
    total: new ValueColumn(Number),
  }
}

class ViewModel extends MainModel {
  static viewName = 'model_view';

  static softDelete = false;

  static hasOperator = false;

  static toKeyword = null;

  static columns = {
    name: new ValueColumn(),
    nickName: new ValueColumn(),
    password: new HashColumn(),
    userIds: new ListColumn(),
    data: new ValueColumn(Object),
    total: new ValueColumn(Number),
  }
}

describe('model', () => {
  beforeAll(async () => {
    await database.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await database.raw('DROP VIEW IF EXISTS model_view');
    await database.schema.dropTableIfExists('model_table');

    await database.schema.createTable('model_table', (table) => {
      table.increments();
      table.string('name');
      table.string('nick_name');
      table.text('password');
      table.specificType('keyword', 'tsvector');
      table.specificType('user_ids', 'bigint[]');
      table.jsonb('data');
      table.timestamps();
      table.integer('total').defaultTo(0);
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('deleted_at');
      table.integer('deleted_by');
    });

    await database.raw('CREATE VIEW model_view AS SELECT * FROM model_table');

    await database.schema.dropTableIfExists('batch_insert');

    await database.schema.createTable('batch_insert', (table) => {
      table.uuid('id').primary().defaultTo(database.raw('uuid_generate_v1mc()'));
      table.string('name');
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('created_at');
      table.timestamp('updated_at');
    });
  });

  afterAll(() => database.destroy());

  beforeEach(async () => {
    await MainModel.mutate.truncate();
    await database('model_table').insert({ name: 'name is one', nick_name: 'nick name is one' });
    await database('model_table').insert({ name: 'name is two', data: { 10: 'xyz' }, user_ids: ['10', '20'] });
    client.mockClear();
  });

  describe('ArrayMutator', () => {
    it('appendValue', async () => {
      const model = await MainModel.load(1);

      await model.appendValue('userIds', '10', 10);
      expect(model.userIds).toEqual(['10']);

      await model.appendValue('userIds', '20', 10);
      expect(model.userIds).toEqual(['10', '20']);

      await model.appendValue('userIds', '10', 10);
      expect(model.userIds).toEqual(['20', '10']);
      expect((await MainModel.load(1)).userIds).toEqual(['20', '10']);

      expect(client).toMatchSnapshot();
    });

    it('removeValue', async () => {
      const model = await MainModel.load(2);

      await model.removeValue('userIds', '10', 10);
      expect(model.userIds).toEqual(['20']);

      expect((await MainModel.load(2)).userIds).toEqual(['20']);

      expect(client).toMatchSnapshot();
    });
  });

  describe('Base', () => {
    describe('static', () => {
      it('displayName', () => {
        expect(MainModel.displayName).toBe('MainModel');
      });

      it('raw', () => {
        expect(MainModel.raw('name = ?', [10]).toString()).toBe('name = 10');
      });

      it('format && signify', () => {
        const { format, signify } = MainModel;
        expect(format({ is_admin: true })).toEqual({ isAdmin: true });
        expect(signify({ isAdmin: true })).toEqual({ is_admin: true });
      });

      it('forge', () => {
        const model = MainModel.forge({ name: 'my name' });
        expect(model.valueOf()).toEqual({ name: 'my name' });
      });

      it('fromModel', () => {
        const { fromModel } = MainModel;
        expect(fromModel('20')).toBe('20');
        expect(fromModel({ nativeId: '20' })).toBe('20');
        expect(fromModel(null)).toBe(null);
      });
    });

    describe('columns', () => {
      it('object', () => {
        const { columns } = MainModel;
        expect(_.keys(columns)).toEqual([
          'name', 'nickName', 'password',
          'userIds', 'data', 'total', 'id',
          'createdAt', 'updatedAt', 'deletedAt',
          'createdBy', 'updatedBy', 'deletedBy',
        ]);
        expect(columns).toMatchSnapshot();
      });

      it('thunk', () => {
        class Thunk extends Model {
          static database = database;

          static tableName = 'model_table';

          static columns = () => ({
            name: new ValueColumn(),
            password: new HashColumn(),
            data: new ValueColumn(Object),
          })
        }
        const { columns } = Thunk;
        expect(_.keys(columns)).toEqual([
          'name', 'password', 'data', 'id',
          'createdAt', 'updatedAt', 'deletedAt',
        ]);
        expect(columns).toMatchSnapshot();
      });
    });

    describe('prototype', () => {
      it('set', () => {
        const model = new MainModel({ name: 'isme', price: 99, total: undefined });
        expect(model.valueOf()).toEqual({ name: 'isme' });
        model.set({ name: 'new name', price: 99, total: undefined });
        expect(model.valueOf()).toEqual({ name: 'new name' });
      });

      it('isNew', () => {
        const model = new MainModel();
        expect(model.isNew).toBe(true);

        model.id = '20';
        expect(model.isNew).toBe(false);
      });

      it('changes', async () => {
        const model = await MainModel.load(1);
        expect(model.changes).toEqual({});

        model.name = 'a new name';
        expect(model.changes).toEqual({ name: 'a new name' });
      });

      it('query', async () => {
        expect(MainModel.query.toString())
          .toBe('select * from "model_table"');

        const model = new MainModel();
        expect(model.query.toString())
          .toBe('select * from "model_table" where "deleted_at" is null');
      });

      it('nativeId', async () => {
        const model = await MainModel.load(1);
        expect(model.id).toBe('iNe9OVLx9dUZwc9SxLDFCEkGEj');
        expect(model.nativeId).toBe(1);
      });

      it('clone', async () => {
        const model = await MainModel.load(1);
        model.name = 'new model one';

        const replica = model.clone();
        expect(model).toEqual(replica);
        expect(model._.previous).toBe(replica._.previous);
        expect(model._.current).not.toBe(replica._.current);

        expect(model.valueOf()).toEqual(replica.valueOf());
        replica.name = 'new model clone';
        expect(model.valueOf()).not.toEqual(replica.valueOf());
      });

      it('merge', async () => {
        const model = await MainModel.load(1);
        expect(model.valueOf())
          .toEqual(expect.objectContaining({ name: 'name is one' }));
        model.merge({ name: 'a name', archive: { items: [20, 40] } });
        expect(model._.previous).toEqual(expect.objectContaining({ name: 'a name' }));
        expect(model._.current).toEqual(expect.objectContaining({ name: 'a name' }));
      });
    });
  });

  describe('Builder', () => {
    let model;
    let view;
    beforeEach(() => {
      model = new MainModel();
      view = new ViewModel();
    });

    it('static query', () => {
      expect(MainModel.query.toString()).toBe('select * from "model_table"');
      expect(ViewModel.query.toString()).toBe('select * from "model_view"');
    });

    it('static mutate', () => {
      expect(MainModel.mutate.toString()).toBe('select * from "model_table"');
      expect(ViewModel.mutate.toString()).toBe('select * from "model_table"');
    });

    it('query', () => {
      expect(model.query.toString())
        .toBe('select * from "model_table" where "deleted_at" is null');
      expect(view.query.toString())
        .toBe('select * from "model_view"');
    });

    it('mutate', () => {
      expect(model.mutate.toString()).toBe('select * from "model_table" where "deleted_at" is null');
      expect(view.mutate.toString()).toBe('select * from "model_table"');
    });
  });

  describe('Batch', () => {
    class BatchInsert extends Model {
      static database = database;

      static hasTimestamps = false;

      static tableName = 'batch_insert';

      static columns = {
        name: new ValueColumn(),
      }
    }

    class BatchInsertWithOperator extends Model {
      static database = database;

      static hasOperator = true;

      static tableName = 'batch_insert';

      static columns = {
        name: new ValueColumn(),
      }
    }

    describe('insert', () => {
      const rows = _.map(_.range(1, 10000), idx => ({ name: `x${idx}` }));
      it('successfully insert', async () => {
        const results = await BatchInsert.batchInsert(rows);
        expect(results.length).toBe(9999);
      });

      it('successfully insert with operator', async () => {
        const results = await BatchInsertWithOperator.batchInsert(rows, 99);
        expect(results.length).toBe(9999);
      });

      it('operator is required', async () => {
        await expect(BatchInsertWithOperator.batchInsert(rows))
          .rejects.toEqual(new Error('operator is required'));
      });
    });
  });

  describe('DefaultValues', () => {
    it('save use default values', async () => {
      const model = new MainModel();
      await model.save(10);
      expect(model.name).toBe('go car');
      expect((await MainModel.load(3)).name).toBe('go car');
      expect(client).toMatchSnapshot();
    });

    it('batch insert use default values', async () => {
      await MainModel.batchInsert([{ nickName: 'aux' }], 10);
      expect((await MainModel.load(3)).name).toBe('go car');
    });
  });

  describe('Cache', () => {
    it('prime && clear', async () => {
      const cache = { prime: jest.fn(), clear: jest.fn() };
      const model = new MainModel({}, { cache });
      model.prime();
      expect(cache.prime).toHaveBeenCalledTimes(0);
      model.clear();
      expect(cache.clear).toHaveBeenCalledTimes(0);

      model.id = 10;
      model.prime();
      expect(cache.prime).toHaveBeenCalledTimes(1);
      model.clear();
      expect(cache.clear).toHaveBeenCalledTimes(1);
    });

    it('load', async () => {
      const cache = { loadMain: jest.fn(() => new MainModel({ id: 2 })) };
      const model = new MainModel({}, { cache });
      const main = model.loadMain('2');
      expect(main.nativeId).toBe('2');

      await main;
      expect(cache.loadMain).toHaveBeenCalledWith('2');
      expect(cache.loadMain).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fetcher', () => {
    describe('fetch', () => {
      it('fetch one', async () => {
        const model = new MainModel({ name: 'name is one', data: { xyz: 1 } });
        await model.fetch();
        expect(model.valueOf()).toMatchSnapshot();
        expect(client).toMatchSnapshot();

        await expect((new MainModel({ name: 'one' })).fetch())
          .resolves.toEqual(null);
        await expect((new MainModel({ name: 'one' })).fetch(NotFoundError))
          .rejects.toEqual(new NotFoundError());
      });

      it('with where', async () => {
        const model = new MainModel();
        model.where({ nickName: 'nick name is one' });
        model.where('total', 0);
        model.where(function where() { return this.where('name', 'name is one'); });
        model.orderBy(['createdAt']);
        model.whereRaw('data IS NULL');
        await model.fetch();
        expect(model.valueOf()).toMatchSnapshot();
        expect(client).toMatchSnapshot();
      });
    });

    describe('saveIfNotExists', () => {
      it('when existed', async () => {
        expect((await new MainModel({ name: 'name is one' }).saveIfNotExists()).nativeId).toBe(1);
        expect(client).toMatchSnapshot();
        expect(client).toHaveBeenCalledTimes(1);
      });

      it('when not existed', async () => {
        expect((await new MainModel({ name: 'name is new' }).saveIfNotExists('10')).nativeId).toBe(3);
        expect(client).toMatchSnapshot();
        expect(client).toHaveBeenCalledTimes(2);
      });
    });

    describe('fetchAll', () => {
      it('no cache', async () => {
        const model = new MainModel({ name: 'name is one' });

        const results = await model.fetchAll();
        expect(results.totalCount).toBe(1);
        expect(_.map(results, data => data.name)).toMatchSnapshot();
        expect(client).toMatchSnapshot();

        await expect((new MainModel({ name: 'one' })).fetchAll())
          .resolves.toEqual(Object.assign([], { totalCount: 0, offset: null, limit: null }));
        await expect((new MainModel({ name: 'one' })).fetchAll(NotFoundError))
          .rejects.toEqual(new NotFoundError());
      });

      it('cache', async () => {
        const model = new MainModel({ name: 'name is one' });
        model.cache = { prime: jest.fn() };
        await model.fetchAll();
        expect(model.cache.prime).toHaveBeenCalledWith(MainModel.toGlobalId(1), expect.anything());
      });
    });

    describe('fetchPage', () => {
      it('offset and first', async () => {
        const model = new MainModel();
        const results = await model.fetchPage({ offset: 1, first: 2 });
        expect(results).toEqual(expect.objectContaining({ totalCount: 2, offset: 1, limit: 2 }));
        expect(_.map(results, data => data.name)).toMatchSnapshot();
        expect(client).toMatchSnapshot();
      });

      it('not set', async () => {
        const model = new MainModel();
        const results = await model.fetchPage();
        expect(results.totalCount).toBe(2);
        expect(_.map(results, data => data.name)).toMatchSnapshot();
        expect(client).toMatchSnapshot();
      });
    });

    describe('fetchCount', () => {
      it('fetch 1', async () => {
        const model = new MainModel({ name: 'name is one' });
        expect(await model.fetchCount()).toBe(1);
      });

      it('fetch 0', async () => {
        const model = new MainModel({ name: 'name is XYZ' });
        await expect(model.fetchCount(NotFoundError))
          .rejects.toEqual(new NotFoundError());
      });
    });
  });

  describe('GlobalId', () => {
    it('integer', () => {
      expect(MainModel.toGlobalId('2020')).toBe('iNe9OVLx9dUZwc9SxLDFCEkGlI');
      expect(MainModel.fromGlobalId('iNe9OVLx9dUZwc9SxLDFCEkGlI')).toBe('2020');

      expect(() => MainModel.fromGlobalId(toGlobalId('type', '2020'))).toThrowErrorMatchingSnapshot();
      expect(fromGlobalId(MainModel.toGlobalId('2020')).type).toBe('MainModel');
    });

    it('uuid', () => {
      class UUID extends Model {
        static database = database;

        static tableName = 'model_table';

        static hasUUID = true;

        static columns = {
          name: new ValueColumn(),
        }
      }

      expect(UUID.toGlobalId('131d069a-8b6e-45d1-af3b-c25c598e06be')).toBe('iUoGyNJVqL88oyTqyk8qPQooAkDN6s');
      expect(UUID.fromGlobalId('iUoGyNJVqL88oyTqyk8qPQooAkDN6s')).toBe('131d069a-8b6e-45d1-af3b-c25c598e06be');

      expect(() => UUID.fromGlobalId(toGlobalId('UUID', '2020'))).toThrowError(new TypeError());
    });

    it('isUUID', () => {
      expect(MainModel.isUUID(faker.random.uuid())).toBe(true);
      expect(MainModel.isUUID('XYZ')).toBe(false);
    });
  });

  describe('Hash', () => {
    it('hash & verify', async () => {
      const model = await MainModel.load(1);
      model.password = 'XYZ2020';
      expect(model.verify('password', 'XYZ2020')).toBe(true);
      expect(model.verify('password', 'XYZ2049')).toBe(false);
    });
  });

  describe('Loader', () => {
    it('dataloader', () => {
      const { dataloader } = MainModel;
      expect(dataloader).toBe(MainModel.dataloader);
    });

    it('softDelete', async () => {
      expect(await MainModel.load()).toBe(null);

      expect(await MainModel.load(1))
        .toEqual(expect.objectContaining({ name: 'name is one' }));

      const results = await Promise.all([
        MainModel.load(1), MainModel.loadMany([1, 2]),
      ]);

      expect(results).toEqual([
        expect.objectContaining({ name: 'name is one' }),
        [expect.objectContaining({ name: 'name is one' }), expect.objectContaining({ name: 'name is two' })],
      ]);

      expect(client).toMatchSnapshot();

      await expect(MainModel.load(99))
        .resolves.toEqual(null);
      await expect(MainModel.load(99, Error))
        .rejects.toEqual(new Error());
      await expect(MainModel.load(99, NotFoundError))
        .rejects.toEqual(new NotFoundError());
      await expect(MainModel.loadMany([99]))
        .resolves.toEqual([null]);
      await expect(MainModel.loadMany([99], NotFoundError))
        .rejects.toEqual(new NotFoundError());
    });

    it('no softDelete', async () => {
      const model = new MainModel({ name: 'for no soft delete load' });
      await (await model.save(10)).destroy(10);
      expect(await ViewModel.load(3))
        .toEqual(expect.objectContaining({ name: 'for no soft delete load' }));
      expect(client).toMatchSnapshot();
    });
  });

  describe('Incrementer', () => {
    it('single', async () => {
      const model = await MainModel.load(1);
      expect(model.total).toBe(0);

      await model.increment('total', 10);
      expect(model.total).toBe(10);
      expect((await MainModel.load(1)).total).toBe(10);

      await model.increment('total', 10);
      expect(model.total).toBe(20);

      expect(client).toMatchSnapshot();
    });

    it('multiple', async () => {
      const model = await MainModel.load(1);
      expect(model.total).toBe(0);

      await model.increment({ total: 10 });
      expect(model.total).toBe(10);

      expect((await MainModel.load(1)).total).toBe(10);
      await model.increment({ total: 10 });

      expect(model.total).toBe(20);

      expect(client).toMatchSnapshot();
    });
  });

  describe('JSONMutator', () => {
    it('addKeyValue', async () => {
      const model = await MainModel.load(1);

      expect(model.valueOf('data')).toBe(null);
      await model.addKeyValue('data', '10', 'xyz', 10);
      expect(model.valueOf('data')).toEqual({ 10: 'xyz' });

      expect(client).toMatchSnapshot();
    });

    it('delKeyValue', async () => {
      const model = await MainModel.load(2);

      expect(model.valueOf('data')).toEqual({ 10: 'xyz' });
      await model.delKeyValue('data', '10', 10);
      expect(model.valueOf('data')).toEqual({});

      expect(client).toMatchSnapshot();
    });
  });

  describe('Mutator', () => {
    describe('sent insert of save', () => {
      it('has operator', async () => {
        const model = new MainModel({ name: 'new is insert' });
        expect(model.valueOf()).toEqual({ name: 'new is insert' });
        await model.save(10);
        expect(model.valueOf()).toEqual(expect.objectContaining({
          createdAt: expect.anything(Date),
          createdBy: 10,
          updatedAt: expect.anything(Date),
          updatedBy: 10,
        }));
        expect(client).toMatchSnapshot();

        await expect(new MainModel().save())
          .rejects.toEqual(new Error('operator is required'));
      });

      it('no operator', async () => {
        const model = new ViewModel({ name: 'new is no operator insert' });
        await model.save();
        expect(model.valueOf()).toEqual(expect.objectContaining({
          createdAt: expect.anything(Date),
          createdBy: null,
          updatedAt: expect.anything(Date),
          updatedBy: null,
        }));
        expect(client).toMatchSnapshot();
      });
    });

    describe('sent update of save', async () => {
      it('has operator', async () => {
        const model = await MainModel.load(1);

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
        const model = await ViewModel.load(1);
        model.set({ name: 'name is no operator update' });
        await model.save();
        expect(client).toMatchSnapshot();
      });
    });

    describe('destroy', () => {
      it('has operator', async () => {
        const model = await MainModel.load(1);

        await model.destroy(10);
        await model.destroy(10);
        expect(client).toMatchSnapshot();
        expect(client).toHaveBeenCalledTimes(2);

        await expect(model.destroy())
          .rejects.toEqual(new Error('operator is required'));
      });

      it('no operator and no soft delete', async () => {
        const model = await ViewModel.load(1);
        await model.destroy();
        expect(client).toMatchSnapshot();
        expect(client).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Searcher', () => {
    it('search', async () => {
      await new MainModel({ name: 'new for action' }).save('10');
      await new MainModel({ name: 'new for search' }).save('10');
      const model = new MainModel();
      model.search('new search');
      const results = await model.fetchAll();

      expect(results.totalCount).toBe(2);
      expect(_.map(results, 'name')).toMatchSnapshot();

      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(3);
    });
  });
});
