import _ from 'lodash';
import { isGlobalId, toGlobalId, fromGlobalId } from '../GlobalId';

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
      const globalId = toGlobalId(type, input);
      expect(isGlobalId(globalId)).toBe(true);
      expect(globalId).toBe(output);
      expect(fromGlobalId(globalId, type)).toBe(value || input);
    });
  });

  it('check global id', () => {
    expect(() => fromGlobalId(toGlobalId(123, 'abc'), 'xyz')).toThrowError(TypeError);
    expect(() => fromGlobalId('!@$')).toThrowError(TypeError);
  });
});
