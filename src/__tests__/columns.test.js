import knex, { client } from 'knex';
import _ from 'lodash';
import { GoneDataError } from 'graphql-tower-errors';
import Model, {
  ValueColumn,
  HashColumn,
  DateColumn,
  DateTimeColumn,
  ListColumn,
  ArchiveColumn,
  CustomColumn,
  EnumColumn,
  ReadOnlyColumn,
  MixedModel,
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
    name: new ValueColumn(),
  }
}

class Member extends Model {
  static database = database;

  static tableName = 'column_user';

  static columns = {
    name: new ValueColumn(),
  }
}

class Buyer extends MixedModel {
  static models = [User, Member];
}

class Column extends Model {
  static database = database;

  static tableName = 'column';

  static columns = {
    name: new ValueColumn(),
    nameAlias: new ValueColumn(String, 'nameAliasNickname'),
    total: new ValueColumn(Number),
    isAdmin: new ValueColumn(Boolean),
    buyer: new ValueColumn(Buyer, 'buyerId'),
    password: new HashColumn(),
    birthday: new DateColumn(),
    checkAt: new DateTimeColumn(),
    size: new EnumColumn(['large', 'medium', 'small']),
    itemIds: new ListColumn(User),
    archiveName: new ArchiveColumn(),
    archiveNameAlias: new ArchiveColumn(new ValueColumn(String, 'nameAliasNickname')),
    archiveTotal: new ArchiveColumn(new ValueColumn(Number)),
    archiveIsAdmin: new ArchiveColumn(new ValueColumn(Boolean)),
    archiveBuyer: new ArchiveColumn(new ValueColumn(User, 'buyerId')),
    archivePassword: new ArchiveColumn(new HashColumn()),
    archiveBirthday: new ArchiveColumn(new DateColumn()),
    archiveCheckAt: new ArchiveColumn(new DateTimeColumn()),
    archiveItems: new ArchiveColumn(new ListColumn()),
    numberOflike: new ArchiveColumn(new ValueColumn(Number, 'Oflike'), 'other'),
    hasSubscription: new ReadOnlyColumn(Boolean),
    numberOfMember: new ReadOnlyColumn(() => 99),
    nothing: new CustomColumn(),
    enabled: new CustomColumn({
      set: (value, data) => _.set(data, 'enabled', value),
      get: data => (!!data.enabled),
    }),
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
      table.string('nothing');
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
    model.nothing = null;
    model.size = null;

    expect(model.name).toBeNull();
    expect(model.nameAlias).toBeNull();
    expect(model.total).toBeNull();
    expect(model.isAdmin).toBeNull();
    expect(model.buyer).toBeNull();
    expect(model.password).toBeNull();
    expect(model.birthday).toBeNull();
    expect(model.checkAt).toBeNull();
    expect(model.itemIds).toEqual([]);
    expect(model.nothing).toBeNull();
    expect(model.size).toBeNull();
  });

  it('when model not found', async () => {
    const column = Column.forge({ archive: { buyerId: '10' } });
    await expect(column.archiveBuyer).rejects.toEqual(new GoneDataError());
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
      birthday: new Date('2020-01-01'),
      checkAt: new Date('2020-04-01T10:00:00'),
      itemIds: [2, 3],
      size: 'medium',
      archiveName: 'my archive name',
      archiveNameAlias: 'my archive nickname',
      archiveTotal: 2049,
      archiveIsAdmin: true,
      archiveBuyer: user.nativeId,
      archivePassword: 'XYZ2049',
      archiveBirthday: new Date('2049-01-01'),
      archiveCheckAt: new Date('2049-04-01T10:00:00'),
      archiveItems: [20, 49, 49],
      numberOflike: new Like(),
      nothing: 'xyz',
      enabled: new Date('2020-12-31'),
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
    expect(model.buyer.nativeId).toBe('1');
    expect((await model.buyer).valueOf()).toEqual(expect.objectContaining({ id: 1, name: 'I`m user' }));
    expect(model.password).not.toBeNull();
    expect(model.birthday).toBe('2020-01-01');
    expect(model.checkAt).toEqual(new Date('2020-04-01T10:00:00'));
    expect(model.size).toBe('medium');
    expect(_.map(model.itemIds, ({ nativeId }) => nativeId)).toEqual([2, 3]);
    expect(Promise.all(model.itemIds)).resolves.toEqual([
      expect.objectContaining({ id: User.toGlobalId('2') }),
      expect.objectContaining({ id: User.toGlobalId('3') }),
    ]);

    expect(model.archiveName).toBe('my archive name');
    expect(model.archiveNameAlias).toBe('my archive nickname');
    expect(model.archiveTotal).toBe(2049);
    expect(model.archiveIsAdmin).toBe(true);
    expect(model.archiveBuyer.nativeId).toBe(1);
    expect((await model.archiveBuyer).valueOf()).toEqual(expect.objectContaining({ id: 1, name: 'I`m user' }));
    expect(model.archivePassword).not.toBeNull();
    expect(model.archiveBirthday).toBe('2049-01-01');
    expect(model.archiveCheckAt).toEqual(new Date('2049-04-01T10:00:00'));
    expect(model.archiveItems).toEqual(['20', '49', '49']);

    expect(model.nothing).toBe('xyz');
    expect(model.enabled).toBe(true);

    expect(model.verify('password', 'XYZ2020')).toBe(true);
    expect(model.verify('password', 'XYZ1010')).toBe(false);
    expect(model.verify('archivePassword', 'XYZ2049')).toBe(true);
    expect(model.verify('archivePassword', 'XYZ1010')).toBe(false);

    expect(model.numberOflike).toBe(99);
    expect(model.hasSubscription).toBeNull();
    model._.current.hasSubscription = true;
    expect(model.hasSubscription).toBe(true);

    expect(model.createdAt).not.toBeNull();
    expect(model.updatedAt).not.toBeNull();
  });
});
