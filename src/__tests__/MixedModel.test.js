import knex from 'knex';
import Model, { MixedModel, ValueColumn, toGlobalId } from '..';

const database = knex();

class Product extends Model {
  static database = database;

  static tableName = 'default_table';

  static load = jest.fn();

  static columns = {
    name: new ValueColumn(),
  }
}

class Gift extends Model {
  static database = database;

  static tableName = 'default_table';

  static load = jest.fn();

  static columns = {
    name: new ValueColumn(),
  }
}

class Target extends MixedModel {
  static models = [Product, Gift];
}

describe('mixed model', () => {
  describe('static', () => {
    it('load', async () => {
      await Target.load(Product.toGlobalId('1'));
      expect(Product.load).toHaveBeenCalledTimes(1);
      await Target.load(Gift.toGlobalId('1'));
      expect(Gift.load).toHaveBeenCalledTimes(1);

      expect(await Target.load(toGlobalId('XYZ', '10'))).toBe(null);
      expect(await Target.load(null)).toBe(null);
    });

    it('loadMany', async () => {
      await Target.loadMany([Product.toGlobalId('1'), Gift.toGlobalId('2')]);
      expect(Product.load).toHaveBeenCalledTimes(1);
      expect(Gift.load).toHaveBeenCalledTimes(1);
    });

    it('fromModel', () => {
      expect(Target.fromModel(null)).toBe(null);
      expect(Target.fromModel(new Product({ id: '10' }))).toBe(Product.toGlobalId('10'));
      expect(Target.fromModel(Product.toGlobalId('10'))).toBe(Product.toGlobalId('10'));
    });
  });
});
