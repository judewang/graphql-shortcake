import { Expiratoin } from '../../columns';

describe('Expiratoin Column', () => {
  it('successfully set & get', () => {
    const expiratoin = new Expiratoin('2020-04-01T10:00:00');
    expect(Number(expiratoin)).toBe(Number.NaN);
    expect(String(expiratoin)).toBe('2020-04-01T02:00:00.000Z');
    expect(new Expiratoin('2014-03-18T10:00:00').toString()).toBe(true);
  });
});
