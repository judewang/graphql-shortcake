import database from './database';
import Model from '..';

class Builder extends Model {
  static database = database;

  static tableName = 'builder';

  static columns = {
    name: { type: String },
  }
}

class BuilderView extends Builder {
  static database = database;

  static viewName = 'builder_view';
}

describe('Builder', () => {
  beforeAll(async () => {
    await database.raw('DROP VIEW IF EXISTS builder_view');
    await database.schema.dropTableIfExists('builder');

    await database.schema.createTable('builder', (table) => {
      table.increments();
      table.string('name');
      table.integer('price');
      table.timestamps();
      table.timestamp('deleted_at');
      table.integer('created_by');
      table.integer('updated_by');
      table.integer('deleted_by');
    });

    await database.raw('CREATE VIEW builder_view AS SELECT * FROM builder');
  });

  it('static query', () => {
    expect(Builder.query.toString()).toBe('select * from "builder"');
    expect(BuilderView.query.toString()).toBe('select * from "builder_view"');
  });

  it('static mutate', () => {
    expect(Builder.mutate.toString()).toBe('select * from "builder"');
    expect(BuilderView.mutate.toString()).toBe('select * from "builder"');
  });

  it('query', () => {
    const model = new Builder();
    expect(model.query.toString())
      .toBe('select * from "builder" where "deleted_at" is null');

    const view = new BuilderView();
    expect(view.query.toString())
      .toBe('select * from "builder_view" where "deleted_at" is null');
  });

  it('mutate', () => {
    const model = new Builder();
    expect(model.mutate.toString()).toBe('select * from "builder" where "deleted_at" is null');

    const view = new BuilderView();
    expect(view.mutate.toString()).toBe('select * from "builder" where "deleted_at" is null');
  });
});
