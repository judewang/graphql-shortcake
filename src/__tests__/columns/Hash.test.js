import { Hash } from '../../columns';

describe('Expiratoin Column', () => {
  it('Hash', () => {
    const hash = new Hash('mykey');
    expect(Number(hash)).toBe(Number.NaN);
    expect(String(hash)).toBe('[object Hash]');
  });

  it('verify', async () => {
    const hash = new Hash('mykey');
    expect(hash.verify('mykey')).toBe(true);
    expect(hash.verify('yourkey')).toBe(false);
  });
});
