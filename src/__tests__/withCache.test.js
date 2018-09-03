import _ from 'lodash';
import { client } from 'knex';
import database from './database';
import Model, { DataCache, toGlobalId } from '..';

class Fruit extends Model {
  static database = database;

  static tableName = 'cache_fruit';

  static columns = {
    name: { type: String },
  }
}

class Airplane extends Model {
  static database = database;

  static tableName = 'cache_airplane';

  static columns = {
    name: { type: String },
  }
}

const Cache = new DataCache([Fruit, Airplane]);

describe('Cache', () => {
  beforeAll(async () => {
    await database.schema.dropTableIfExists('cache_fruit');
    await database.schema.createTable('cache_fruit', (table) => {
      table.increments();
      table.string('name');
      table.timestamps();
      table.datetime('deleted_at');
    });

    await new Fruit().insert({ name: 'banana' });
    await new Fruit().insert({ name: 'grape' });
    await new Fruit().insert({ name: 'apple' });

    await database.schema.dropTableIfExists('cache_airplane');
    await database.schema.createTable('cache_airplane', (table) => {
      table.increments();
      table.string('name');
      table.timestamps();
      table.datetime('deleted_at');
    });

    await new Airplane().insert({ name: 'Airbus A380' });
    await new Airplane().insert({ name: 'Airbus A330' });
    await new Airplane().insert({ name: 'Boeing 777-300ER' });
  });

  describe('update cache', () => {
    it('find', async () => {
      const cache = new Cache();
      const { fruit } = cache;

      expect(_.size(await fruit.fetchAll())).toBe(3);

      await cache.load(Fruit.toGlobalId('1'));

      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(1);
    });

    it('insert', async () => {
      const cache = new Cache();
      const { fruit } = cache;

      await fruit.set({ name: 'lemon' }).save();
      await cache.loadFruit(Fruit.toGlobalId(4));
      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(1);
    });

    it('update', async () => {
      const cache = new Cache();
      const fruit = await cache.loadFruit(Fruit.toGlobalId(4));
      expect(fruit.name).toBe('lemon');

      await fruit.set({ name: 'lichee' }).save();
      expect(fruit.name).toBe('lichee');

      await expect(cache.loadFruit(Fruit.toGlobalId(4)))
        .resolves.toEqual(expect.objectContaining({ name: 'lichee' }));

      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(2);
    });

    it('destroy', async () => {
      const cache = new Cache();
      const fruit = await cache.loadFruit(Fruit.toGlobalId(4));

      await fruit.destroy();

      await expect(cache.loadFruit(Fruit.toGlobalId(4)))
        .resolves.toBe(null);

      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(3);
    });
  });

  describe('load & loadMany', () => {
    it('successfully use cache 1', async () => {
      const cache = new Cache();

      await expect(cache.load(Fruit.toGlobalId('1')))
        .resolves.toEqual(expect.objectContaining({ name: 'banana' }));

      await expect(cache.load(Airplane.toGlobalId('1')))
        .resolves.toEqual(expect.objectContaining({ name: 'Airbus A380' }));

      await expect(Promise.all([
        cache.loadFruit(Fruit.toGlobalId('1')),
        cache.loadAirplane(Airplane.toGlobalId('2')),
        cache.loadMany([Fruit.toGlobalId('3'), Airplane.toGlobalId('1'), Airplane.toGlobalId('4')]),
      ])).resolves.toMatchSnapshot();

      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(4);
    });

    it('successfully use cache 2', async () => {
      const cache = new Cache();

      await expect(cache.load(Fruit.toGlobalId('1')))
        .resolves.toEqual(expect.objectContaining({ name: 'banana' }));

      await expect(cache.load(Airplane.toGlobalId('1')))
        .resolves.toEqual(expect.objectContaining({ name: 'Airbus A380' }));

      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(2);
    });

    it('successfully model load', async () => {
      const cache = new Cache();
      const { fruit } = cache;

      fruit.id = '1';
      await expect(fruit.load())
        .resolves.toEqual(expect.objectContaining({ name: 'banana' }));
      expect(client).toHaveBeenCalledTimes(1);

      await expect(cache.load(Fruit.toGlobalId('1')))
        .resolves.toEqual(expect.objectContaining({ name: 'banana' }));

      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(1);
    });

    it('check type', async () => {
      const cache = new Cache();

      await expect(cache.load(toGlobalId('tree', '1')))
        .resolves.toBeNull();

      await expect(cache.loadAirplane(Fruit.toGlobalId('10'), TypeError))
        .rejects.toEqual(new TypeError());

      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(0);
    });
  });

  describe('DataCache', () => {
    it('clear & clearAll', async () => {
      const cache = new Cache();

      await cache.load(Fruit.toGlobalId('1'));
      await cache.load(Fruit.toGlobalId('1'));
      cache.clear(Fruit.toGlobalId('1'));
      await cache.load(Fruit.toGlobalId('1'));
      await cache.load(Fruit.toGlobalId('2'));
      cache.clearAll();
      await cache.load(Fruit.toGlobalId('1'));

      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(4);
    });
  });

  it('prime', async () => {
    const cache = new Cache();

    const id = Fruit.toGlobalId('10');
    const fruit = Fruit.forge({ id: '10', name: 'apple' });

    expect(fruit.cache).toBeNull();
    cache.prime(id, fruit);
    expect(fruit.cache).toBe(cache);

    await expect(cache.load(id))
      .resolves.toEqual(expect.objectContaining({ id, name: 'apple' }));

    expect(client).toHaveBeenCalledTimes(0);
  });
});
