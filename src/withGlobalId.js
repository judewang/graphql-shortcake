import { toGlobalId, fromGlobalId } from './GlobalId';

export default Parent => class GlobalId extends Parent {
  static fromGlobalId(value) {
    const { displayName } = this;
    return fromGlobalId(value, displayName);
  }

  static toGlobalId(value) {
    const { displayName } = this;
    return toGlobalId(displayName, value);
  }
};
