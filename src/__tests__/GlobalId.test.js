import _ from 'lodash';
import GlobalId, { isGlobalId, toGlobalId, fromGlobalId } from '../GlobalId';

describe('GlobalId', () => {
  it('isGlobalId & toGlobalId & fromGlobalId', () => {
    const type = 'GlobalType';

    _.forEach([
      ['123456789', 'iN2T1VQ2b3u8TB0vOWmpGCbdVlUz'],
      [Buffer.from('stardrive'), 'iSABqDjWj27myTTozwJ9Zz5w5UlBV', 'stardrive'],
      [9223372036854774000, 'iN2T1VQ2b3u8TB0vOhmAOzc3Et3Q', '9223372036854774000'],
      ['stardrive', 'iSABqDjWj27myTTozwJ9Zz5w5UlBV'],
      ['0f2c4ccd-eeb7-44fc-961c-6afdda24a0e7', 'iUsFHSdfuZlXILU4xFFuOOPzxKQVG99scTWB6t'],
    ], ([input, output, value]) => {
      const gid = toGlobalId(type, input);
      expect(isGlobalId(gid)).toBe(true);
      expect(gid).toBe(output);
      expect(fromGlobalId(gid, type)).toBe(value || input);
    });
  });

  it('GlobalId', () => {
    const type = 'GlobalType';

    const gid = fromGlobalId(toGlobalId(type, 9223372036854774000));
    expect(gid.type).toBe(type);
    expect(gid.toBigint()).toEqual('9223372036854774000');
    expect(gid.toUUID()).toEqual('00000000-0000-0000-7fff-fffffffff8f0');
    expect(gid.toString()).toEqual('9223372036854774000');
    expect(gid.toJSON()).toEqual('9223372036854774000');

    expect(new GlobalId('123', 'DEF').toString()).toEqual('123');
  });

  it('check global id', () => {
    expect(() => fromGlobalId(toGlobalId(123, 'abc'), 'xyz')).toThrowError(TypeError);
    expect(() => fromGlobalId('!@$')).toThrowError(TypeError);
  });
});
