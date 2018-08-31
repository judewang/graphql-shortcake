import _ from 'lodash';
import knex, { client } from 'knex';
import Model, { DataCache, toGlobalId } from '..';

const database = knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    user: 'postgres',
    password: null,
    database: 'graphql_tower',
  },
});

class Car extends Model {
  static database = database;

  static tableName = 'car';

  static columns = {
    name: { type: String },
  }
}

class House extends Model {
  static database = database;

  static tableName = 'house';

  static columns = {
    name: { type: String },
  }
}

class Cache extends DataCache {
  static Car = Car;

  static House = House;
}

describe('DataCache', () => {
  afterAll(() => database.destroy());

  describe('load & loadMany', () => {
    it('cache 1', async () => {
      const cache = new Cache();

      client.mockReturnValueOnce([{ id: '1', name: '1 of car' }]);
      await cache.load(Car.toGlobalId('1'));

      client.mockReturnValueOnce([{ id: '1', name: '1 of house' }]);
      await cache.load(House.toGlobalId('1'));

      client.mockReturnValueOnce([{ id: '2', name: '2 of house' }, { id: '4', name: '4 of house' }]);
      client.mockReturnValueOnce([{ id: '3', name: '3 of car' }]);

      await Promise.all([
        cache.loadCar(Car.toGlobalId('1')),
        cache.loadHouse(House.toGlobalId('2')),
        cache.loadMany([Car.toGlobalId('3'), House.toGlobalId('1'), House.toGlobalId('4')]),
      ]);

      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(4);
    });

    it('cache 2', async () => {
      const cache = new Cache();

      client.mockReturnValueOnce([{ id: '1', name: '1 of car' }]);
      await cache.load(Car.toGlobalId('1'));

      client.mockReturnValueOnce([{ id: '1', name: '1 of house' }]);
      await cache.load(House.toGlobalId('1'));

      expect(client).toMatchSnapshot();
      expect(client).toHaveBeenCalledTimes(2);
    });
  });

  it('check type', async () => {
    const cache = new Cache();

    await expect(cache.load(toGlobalId('tree', '1'))).resolves.toBeNull();

    client.mockReturnValueOnce([]);
    await expect(cache.load(Car.toGlobalId('1')))
      .resolves.toBeNull();

    await expect(cache.load(Car.toGlobalId('1'), Error))
      .rejects.toEqual(new Error());

    await expect(cache.loadHouse(Car.toGlobalId('2'), TypeError))
      .rejects.toEqual(new TypeError());

    expect(client).toMatchSnapshot();
    expect(client).toHaveBeenCalledTimes(1);
  });

  describe('prime', async () => {
    it('when prime new data', async () => {
      const id = Car.toGlobalId('1');

      const cache = new Cache();

      const car = Car.forge({ id: '1', name: '1 of car' });
      expect(car.cache).toBeNull();
      cache.prime(id, car);
      expect(car.cache).toBe(cache);
      await expect(cache.load(id))
        .resolves.toEqual(expect.objectContaining({ id, name: '1 of car' }));
      expect(client).toHaveBeenCalledTimes(0);

      cache.prime(id);
      client.mockReturnValueOnce([{ id: '1', name: '1 of car again' }]);
      await expect(cache.load(id))
        .resolves.toEqual(expect.objectContaining({ id, name: '1 of car again' }));
      expect(client).toHaveBeenCalledTimes(1);
    });

    it('when model does not exist', () => {
      const cache = new Cache();
      cache.dataloader = jest.fn();
      cache.prime(toGlobalId('tree', '1'));

      expect(cache.dataloader).toHaveBeenCalledTimes(0);
    });
  });

  it('clear & clearAll', async () => {
    const cache = new Cache();

    client.mockReturnValueOnce([{ id: '1', name: '1 of car' }]);
    client.mockReturnValueOnce([{ id: '1', name: '1 of car' }]);
    client.mockReturnValueOnce([{ id: '1', name: '1 of car' }]);

    await cache.load(Car.toGlobalId('1'));
    await cache.load(Car.toGlobalId('1'));
    cache.clear(Car.toGlobalId('1'));
    await cache.load(Car.toGlobalId('1'));
    cache.clearAll();
    await cache.load(Car.toGlobalId('1'));

    expect(client).toMatchSnapshot();
    expect(client).toHaveBeenCalledTimes(3);
  });

  it('new model', async () => {
    const cache = new Cache();
    const { car } = cache;

    client.mockReturnValueOnce([{ id: '1', name: '1 of car' }, { id: '2', name: '2 of car' }]);
    expect(_.size(await car.fetchAll())).toBe(2);

    await cache.load(Car.toGlobalId('1'));

    expect(client).toMatchSnapshot();
    expect(client).toHaveBeenCalledTimes(1);
  });
});
