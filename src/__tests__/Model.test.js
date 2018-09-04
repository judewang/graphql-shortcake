import database from './database';
import Model from '..';

class MainModel extends Model {
  static database = database;

  static tableName = 'model';

  static hasOperator = true;

  static columns = {
    name: { type: String },
    price: { type: Number },
  }
}

describe('model', () => {
  beforeAll(async () => {
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

    await new MainModel().insert({ name: 'herbivore', price: 10 });
  });

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
      expect(model.values).toEqual({ name: 'my name' });
    });
  });

  describe('prototype', () => {
    it('set', async () => {
      const model = new MainModel({ name: 'apple', price: 20 });
      expect(model.values).toEqual({ name: 'apple', price: 20 });

      await model.save(60);
      model.set({ name: 'lemon' });
      expect(model.values).toEqual(expect.objectContaining({ name: 'lemon', price: 20 }));
      expect(model.previous).toEqual(expect.objectContaining({ name: 'apple' }));
    });

    it('isNew', () => {
      const model = new MainModel();
      expect(model.isNew).toBe(true);

      model.id = '20';
      expect(model.isNew).toBe(false);
    });

    it('nativeId', async () => {
      const model = await MainModel.load(1);
      expect(model.id).toBe('iNe9OVLx9dUZwc9SxLDFCEkGEj');
      expect(model.nativeId).toBe('1');
    });

    it('clone', async () => {
      const model = await MainModel.load(1);
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
      const model = await MainModel.load(1);
      expect(model.values).toEqual(expect.objectContaining({ name: 'herbivore' }));
      model.merge({ name: 'lichee' });
      expect(model.previous).toEqual(expect.objectContaining({ name: 'lichee' }));
      expect(model.current).toEqual(expect.objectContaining({ name: 'lichee' }));
    });

    it('toString', async () => {
      const model = await MainModel.load(1);
      expect(Number(model)).toBe(Number.NaN);
      expect(String(model)).toBe(MainModel.toGlobalId('1'));
    });
  });
});
