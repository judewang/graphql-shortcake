import knex from 'knex';
import Model, { MixedModel, toGlobalId } from '../..';

const database = knex();

class Product extends Model {
  static database = database;

  static tableName = 'default_table';

  static load = jest.fn();

  static columns = {
    name: { type: String },
  }
}

class Gift extends Model {
  static database = database;

  static tableName = 'default_table';

  static load = jest.fn();

  static columns = {
    name: { type: String },
  }
}

const Target = new MixedModel([Product, Gift]);

describe('mixed model', () => {
  it('successfully set & get', () => {
    const target = new Target(Product.toGlobalId('1'));
    expect(Number(target)).toBe(Number.NaN);
    expect(String(target)).toBe('iN2RngM3fgWTt0fzinySmNJB');
  });

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
  });
});
