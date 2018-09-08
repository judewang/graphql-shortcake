import _ from 'lodash';
import database from './database';
import Model from '..';

class Main extends Model {
  static database = database;

  static tableName = 'model';

  static hasOperator = true;

  static columns = {
    name: { type: String },
    price: { type: Number },
  }
}

class View extends Main {
  static viewName = 'model_view';

  static columns = {
    name: { type: String },
  }
}

describe('model', () => {
  beforeAll(async () => {
    await database.raw('DROP VIEW IF EXISTS model_view');
    await database.schema.dropTableIfExists('model');

    await database.schema.createTable('model', (table) => {
      table.increments();
      table.string('name');
      table.integer('price');
      table.timestamps();
      table.timestamp('deleted_at');
      table.integer('created_by');
      table.integer('updated_by');
      table.integer('deleted_by');
    });

    await database.raw('CREATE VIEW model_view AS SELECT * FROM model');

    await new Main().insert({ name: 'herbivore', price: 10 });
  });

  describe('static', () => {
    it('displayName', () => {
      expect(Main.displayName).toBe('Main');
    });

    it('raw', () => {
      expect(Main.raw('name = ?', [10]).toString()).toBe('name = 10');
    });

    it('format && signify', () => {
      const { format, signify } = Main;
      expect(format({ is_admin: true })).toEqual({ isAdmin: true });
      expect(signify({ isAdmin: true })).toEqual({ is_admin: true });
    });

    it('forge', () => {
      const model = Main.forge({ name: 'my name' });
      expect(model.values).toEqual({ name: 'my name' });
    });

    it('refreshView', async () => {
      _.forEach(_.range(1, 10), () => View.refreshView());
      await new Promise(resolve => setTimeout(resolve, 700));
    });
  });

  describe('prototype', () => {
    it('set', async () => {
      const model = new Main({ name: 'apple', price: 20 });
      expect(model.values).toEqual({ name: 'apple', price: 20 });

      await model.save(60);
      model.set({ name: 'lemon' });
      expect(model.values).toEqual(expect.objectContaining({ name: 'lemon', price: 20 }));
      expect(model.previous).toEqual(expect.objectContaining({ name: 'apple' }));
    });

    it('isNew', () => {
      const model = new Main();
      expect(model.isNew).toBe(true);

      model.id = '20';
      expect(model.isNew).toBe(false);
    });

    it('nativeId', async () => {
      const model = await Main.load(1);
      expect(model.id).toBe('iN24bG2YWBL9lgDcmuOH');
      expect(model.nativeId).toBe('1');
    });

    it('clone', async () => {
      const model = await Main.load(1);
      model.name = 'new model one';
      const replica = model.clone();

      expect(model).toEqual(replica);
      expect(model.previous).toBe(replica.previous);
      expect(model.current).not.toBe(replica.current);
      expect(model.values).toEqual(replica.values);

      replica.name = 'new model clone';
      expect(model.values).not.toEqual(replica.values);
      expect(model.previous).toBe(replica.previous);
    });

    it('merge', async () => {
      const model = await Main.load(1);
      expect(model.values).toEqual(expect.objectContaining({ name: 'herbivore' }));
      model.merge({ name: 'lichee' });
      expect(model.previous).toEqual(expect.objectContaining({ name: 'lichee' }));
      expect(model.current).toEqual(expect.objectContaining({ name: 'lichee' }));
    });

    it('toString', async () => {
      const model = await Main.load(1);
      expect(Number(model)).toBe(Number.NaN);
      expect(String(model)).toBe(Main.toGlobalId('1'));
    });
  });
});
