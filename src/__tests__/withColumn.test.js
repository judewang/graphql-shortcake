import { client } from 'knex';
import _ from 'lodash';
import database from './database';
import Model, {
  Hash, DateTime, Enum, Expiratoin, MixedModel,
} from '..';

class User extends Model {
  static database = database;

  static tableName = 'column_user';

  static columns = {
    name: { type: String },
  }
}

class Member extends Model {
  static database = database;

  static columns = {
    name: { type: String },
  }
}

const UserMixed = new MixedModel([User, Member]);

const SizeEnum = new Enum(['large', 'medium', 'small']);

class Column extends Model {
  static database = database;

  static tableName = 'column';

  static hasOperator = true;

  static columns = {
    aString: { type: String },
    aNumber: { type: Number },
    aBoolean: { type: Boolean },
    aModel: { type: User, name: 'modelId' },
    aMixedModel: { type: UserMixed, name: 'mixedModelId' },
    aHash: { type: Hash },
    aExpiratoin: { type: Expiratoin },
    aDate: { type: DateTime.Date },
    aDatetime: { type: DateTime },
    aEnum: { type: SizeEnum },
    aArray: { type: [String] },
    aArrayModel: { type: [User] },
    aAlias: { type: String, name: 'aliasName' },
    aArchive: { type: String, paths: ['archive'] },
    aArchiveModel: { type: User, paths: ['archive'] },
    aArchiveAlias: { type: String, paths: ['archive'], name: 'aliasName' },
    aOtherPath: { type: Number, paths: ['other'] },
  }
}

describe('Column', () => {
  beforeAll(async () => {
    await database.schema.dropTableIfExists('column');
    await database.schema.createTable('column', (table) => {
      table.increments();
      table.string('name');
      table.string('a_string');
      table.integer('a_number');
      table.boolean('a_boolean');
      table.bigInteger('model_id');
      table.string('mixed_model_id');
      table.text('a_hash');
      table.datetime('a_expiratoin');
      table.date('a_date');
      table.datetime('a_datetime');
      table.specificType('a_enum', 'smallint');
      table.specificType('a_array', 'text[]');
      table.specificType('a_array_model', 'integer[]');
      table.string('alias_name');
      table.jsonb('archive');
      table.jsonb('other');
      table.timestamps();
      table.integer('created_by');
      table.integer('updated_by');
      table.timestamp('deleted_at');
      table.integer('deleted_by');
    });

    await database.schema.dropTableIfExists('column_user');
    await database.schema.createTable('column_user', (table) => {
      table.increments();
      table.string('name');
      table.timestamps();
      table.datetime('deleted_at');
    });

    await new Column().insert({ name: 'banana' });
  });

  it('when value is null', async () => {
    const column = await Column.load(1);
    _.forEach([
      'aString', 'aNumber', 'aBoolean',
      'aModel', 'aMixedModel',
      'aHash', 'aExpiratoin',
      'aDate', 'aDatetime', 'aEnum',
      'aArray', 'aArrayModel', 'aAlias',
      'aArchive', 'aArchiveModel', 'aArchiveAlias',
      'aOtherPath',
    ], (name) => {
      expect(column[name]).toBeNull();
    });
    expect(column).toMatchSnapshot();
  });

  it('when model not found', async () => {
    const column = Column.forge({ archive: { aArchiveModel: '10' } });
    await expect(column.aArchiveModel).resolves.toBe(null);
  });

  it('when column no define', () => {
    const column = new Column();
    expect(column.coffee).toBe(undefined);
  });

  it('save to postgres', async () => {
    const user = new User({ name: 'I`m user' });
    await user.save();

    const model = new Column({
      aString: 'apple',
      aNumber: 99,
      aBoolean: true,
      aModel: user,
      aMixedModel: user,
      aHash: 'mykey',
      aExpiratoin: new Date('2014-03-18T10:00:00'),
      aDate: '2020-01-01',
      aDatetime: new Date('2020-04-01T10:00:00'),
      aEnum: 'medium',
      aArray: ['avocado', 'banana'],
      aArrayModel: [user],
      aAlias: 'cherry',
      aArchive: 'coconut',
      aArchiveModel: user,
      aArchiveAlias: 'grape',
      aOtherPath: 20,
    });

    await model.save(10);
    expect(model).toMatchSnapshot();
    expect(model.id).toBe(Column.toGlobalId('2'));
    expect(`${model.aDate}`).toBe('2020-01-01');
    expect(client).toHaveBeenCalledTimes(2);
  });

  it('fetch from postgres', async () => {
    const model = await Column.load('2');
    expect(model).toMatchSnapshot();
    expect(`${model.aDate}`).toBe('2020-01-01');
    expect(client).toHaveBeenCalledTimes(1);
  });

  describe('columns', () => {
    it('object', () => {
      const { columns } = Column;
      expect(_.keys(columns)).toEqual([
        'aString', 'aNumber', 'aBoolean',
        'aModel', 'aMixedModel', 'aHash',
        'aExpiratoin', 'aDate', 'aDatetime',
        'aEnum', 'aArray', 'aArrayModel',
        'aAlias', 'aArchive', 'aArchiveModel',
        'aArchiveAlias', 'aOtherPath',
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
          name: { type: String },
          password: { type: Hash },
          data: { type: Object },
        })
      }
      const { columns } = Thunk;
      expect(_.keys(columns)).toEqual([
        'name', 'password', 'data',
        'createdAt', 'updatedAt', 'deletedAt',
      ]);
      expect(columns).toMatchSnapshot();
    });
  });
});
