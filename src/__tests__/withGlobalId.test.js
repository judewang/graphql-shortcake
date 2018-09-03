import database from './database';
import Model, { toGlobalId, fromGlobalId } from '..';

class GlobalId extends Model {
  static database = database;

  static tableName = 'global';

  static hasOperator = true;

  static columns = {
    name: { type: String },
  }
}

describe('GlobalId', () => {
  it('check type', () => {
    expect(() => (
      fromGlobalId(toGlobalId('type', '2020'), 'Global')
    )).toThrowErrorMatchingSnapshot();

    const globalId = fromGlobalId(GlobalId.toGlobalId('2020'));
    expect(Number(globalId)).toBe(Number.NaN);
    expect(globalId.type).toBe('GlobalId');
  });

  it('integer', () => {
    expect(GlobalId.toGlobalId('2020')).toBe('iN8yUEbmUzP38BSbZOfNFlwH6');
    expect(GlobalId.fromGlobalId('iN8yUEbmUzP38BSbZOfNFlwH6')).toBe('2020');
  });

  it('uuid', () => {
    expect(GlobalId.toGlobalId('131d069a-8b6e-45d1-af3b-c25c598e06be'))
      .toBe('iU3BGtjDSSJb0AwIQxlNfp3ajYMWTPYUTbFG');
    expect(GlobalId.fromGlobalId('iU3BGtjDSSJb0AwIQxlNfp3ajYMWTPYUTbFG'))
      .toBe('131d069a-8b6e-45d1-af3b-c25c598e06be');
  });

  it('string', () => {
    expect(GlobalId.toGlobalId('now')).toBe('iSSkMrHsxk1DPwXwUJ');
    expect(GlobalId.fromGlobalId('iSSkMrHsxk1DPwXwUJ')).toBe('now');
  });
});
