import { client } from 'knex';
import _ from 'lodash';
import database from './database';
import Model, {
  Hash, DateTime, Enum, Expiratoin, MixedModel,
} from '..';

class Like {
  value = 99;

  valueOf() {
    return this.value;
  }
}

class User extends Model {
  static database = database;

  static tableName = 'column_user';

  static columns = {
    name: { type: String },
  }
}

class Member extends Model {
  static database = database;

  static tableName = 'column_user';

  static columns = {
    name: { type: String },
  }
}

const Buyer = new MixedModel([User, Member]);
const Size = new Enum(['large', 'medium', 'small']);

class Column extends Model {
  static database = database;

  static tableName = 'column';

  static columns = {
    name: { type: String },
    nameAlias: { type: String, name: 'nameAliasNickname' },
    total: { type: Number },
    isAdmin: { type: Boolean },
    buyer: { type: Buyer, name: 'buyerId' },
    password: { type: Hash },
    birthday: { type: DateTime.Date },
    checkAt: { type: DateTime },
    size: { type: Size },
    itemIds: { type: [User] },
    enabled: { type: Expiratoin },
    archiveName: { type: String, paths: ['archive'] },
    archiveNameAlias: { type: String, paths: ['archive'], name: 'nameAliasNickname' },
    archiveTotal: { type: Number, paths: ['archive'] },
    archiveIsAdmin: { type: Boolean, paths: ['archive'] },
    archiveBuyer: { type: User, paths: ['archive'], name: 'buyerId' },
    archivePassword: { type: Hash, paths: ['archive'] },
    archiveBirthday: { type: DateTime.Date, paths: ['archive'] },
    archiveCheckAt: { type: DateTime, paths: ['archive'] },
    archiveItems: { type: [String], paths: ['archive'] },
    numberOflike: { type: Number, paths: ['other'], name: 'Oflike' },
  }
}

describe('Columns', () => {
  beforeAll(async () => {
    await database.schema.dropTableIfExists('column');
    await database.schema.createTable('column', (table) => {
      table.increments();
      table.string('name');
      table.string('name_alias_nickname');
      table.bigInteger('total');
      table.boolean('is_admin');
      table.string('buyer_id');
      table.text('password');
      table.date('birthday');
      table.datetime('check_at');
      table.specificType('size', 'smallint');
      table.specificType('item_ids', 'integer[]');
      table.jsonb('archive');
      table.jsonb('other');
      table.datetime('enabled');
      table.timestamps();
      table.datetime('deleted_at');
    });

    await database.schema.dropTableIfExists('column_user');
    await database.schema.createTable('column_user', (table) => {
      table.increments();
      table.string('name');
      table.timestamps();
      table.datetime('deleted_at');
    });
  });

  afterAll(() => database.destroy());

  it('when value is null', async () => {
    const model = new Column();

    model.name = null;
    model.nameAlias = null;
    model.total = null;
    model.isAdmin = null;
    model.buyer = null;
    model.password = null;
    model.birthday = null;
    model.checkAt = null;
    model.itemIds = null;
    model.size = null;

    expect(model.name).toBeNull();
    expect(model.nameAlias).toBeNull();
    expect(model.total).toBeNull();
    expect(model.isAdmin).toBeNull();
    expect(model.buyer).toBeNull();
    expect(model.password).toBeNull();
    expect(model.birthday).toBeNull();
    expect(model.checkAt).toBeNull();
    expect(model.itemIds).toBeNull();
    expect(model.size).toBeNull();
  });

  it('when model not found', async () => {
    const column = Column.forge({ archive: { buyerId: '10' } });
    await expect(column.archiveBuyer).resolves.toBe(null);
  });

  it('save to postgres', async () => {
    const user = new User({ name: 'I`m user' });
    await user.save();
    await (new User({ name: 'I`m user 2' })).save();
    await (new User({ name: 'I`m user 3' })).save();

    const model = new Column({
      name: 'my name',
      nameAlias: 'my nickname',
      total: 2020,
      isAdmin: true,
      buyer: user,
      password: 'XYZ2020',
      birthday: '2020-01-01',
      checkAt: new Date('2020-04-01T10:00:00'),
      itemIds: [2, 3],
      size: 'medium',
      archiveName: 'my archive name',
      archiveNameAlias: 'my archive nickname',
      archiveTotal: 2049,
      archiveIsAdmin: true,
      archiveBuyer: user,
      archivePassword: 'XYZ2049',
      archiveBirthday: new Date('2049-01-01'),
      archiveCheckAt: new Date('2049-04-01T10:00:00'),
      archiveItems: [20, 49, 49],
      numberOflike: new Like(),
      enabled: new Date('2010-12-31'),
    });

    await model.save();
    expect(model.id).toBe(Column.toGlobalId('1'));
  });

  it('fetch from postgres', async () => {
    const model = new Column({ name: 'my name' });
    await model.fetch();
    expect(client).toMatchSnapshot();
    expect(model.id).toBe(Column.toGlobalId('1'));
    expect(model.name).toBe('my name');
    expect(model.nameAlias).toBe('my nickname');
    expect(model.total).toBe(2020);
    expect(model.isAdmin).toBe(true);
    expect(model.buyer.valueOf()).toBe('iN2I0oUUhtxVJpJ8Siv3');
    expect(model.password).not.toBeNull();
    expect(`${model.birthday}`).toBe('2020-01-01');
    expect(new Date(model.checkAt)).toEqual(new Date('2020-04-01T10:00:00'));
    expect(`${model.size}`).toBe('medium');
    expect(_.map(model.itemIds, _.toString)).toEqual(['iN2I0oUUhtxVJpJ8Siv4', 'iN2I0oUUhtxVJpJ8Siv5']);
    expect(_.map(model.itemIds, 'nativeId')).toEqual(['2', '3']);
    expect(Promise.all(model.itemIds)).resolves.toEqual([
      expect.objectContaining({ id: User.toGlobalId('2') }),
      expect.objectContaining({ id: User.toGlobalId('3') }),
    ]);

    expect(model.archiveName).toBe('my archive name');
    expect(model.archiveNameAlias).toBe('my archive nickname');
    expect(model.archiveTotal).toBe(2049);
    expect(model.archiveIsAdmin).toBe(true);
    expect(model.archiveBuyer.nativeId).toBe('1');
    expect((await model.archiveBuyer).name).toEqual('I`m user');
    expect(model.archivePassword).not.toBeNull();
    expect(`${model.archiveBirthday}`).toBe('2049-01-01');
    expect(new Date(model.archiveCheckAt)).toEqual(new Date('2049-04-01T10:00:00'));
    expect(model.archiveItems).toEqual(['20', '49', '49']);

    expect(Boolean(model.enabled)).toBe(true);

    expect(model.password.verify('XYZ2020')).toBe(true);
    expect(model.password.verify('XYZ1010')).toBe(false);
    expect(model.archivePassword.verify('XYZ2049')).toBe(true);
    expect(model.archivePassword.verify('XYZ1010')).toBe(false);

    expect(model.numberOflike).toBe(99);

    expect(model.createdAt).not.toBeNull();
    expect(model.updatedAt).not.toBeNull();
  });
});
