import { isGlobalId, toGlobalId, fromGlobalId } from './GlobalId';

export default Parent => class GlobalId extends Parent {
  static hasUUID = false;

  static isUUID(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
  }

  static fromGlobalId(value) {
    const { displayName } = this;
    const id = isGlobalId(value) ? fromGlobalId(value, displayName) : value;
    if (this.hasUUID && !this.isUUID(id)) throw new TypeError();
    return id;
  }

  static toGlobalId(value) {
    const { displayName } = this;
    return isGlobalId(value) ? value : toGlobalId(displayName, value);
  }
};
