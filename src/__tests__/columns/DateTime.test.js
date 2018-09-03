import { DateTime } from '../../columns';

describe('DateTime Column', () => {
  it('successfully set & get', () => {
    const date = new DateTime.Date('2020-01-01');
    expect(Number(date)).toBe(Number.NaN);
    expect(String(date)).toBe('2020-01-01');
    expect(String(new DateTime.Date(new Date(1535870025788)))).toBe('2018-09-02');
  });
});
