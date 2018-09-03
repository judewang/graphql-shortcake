import { Enum } from '../../columns';

const SizeEnum = new Enum(['large', 'medium', 'small']);

describe('Enum Column', () => {
  it('successfully set & get', () => {
    const size = new SizeEnum('small');
    expect(Number(size)).toBe(2);
    expect(String(size)).toBe('small');
  });
});
