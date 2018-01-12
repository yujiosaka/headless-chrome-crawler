/**
 * @interface
 */
class BaseCache {
  /**
   * @param {!Object=} settings
   */
  constructor(settings) {
    this._settings = settings || {};
  }

  /**
   * @return {!Promise}
   */
  init() {
    throw new Error('Init is not overridden!');
  }

  /**
   * @return {!Promise}
   */
  close() {
    throw new Error('Close is not overridden!');
  }

  /**
   * @return {!Promise}
   */
  clear() {
    throw new Error('Clear is not overridden!');
  }

  /**
   * @param {!string} key
   * @return {!Promise}
   */
  get(key) {
    throw new Error('Get is not overridden!');
  }

  /**
   * @param {!string} key
   * @param {!string} value
   * @return {!Promise}
   */
  set(key, value) {
    throw new Error('Set is not overridden!');
  }

  /**
   * @param {!string} key
   * @param {!string} value
   * @param {!number=} priority
   * @return {!Promise}
   */
  enqueue(key, value, priority) {
    throw new Error('Enqueue is not overridden!');
  }

  /**
   * @param {!string} key
   * @return {!Promise}
   */
  dequeue(key) {
    throw new Error('Dequeue is not overridden!');
  }

  /**
   * @param {!string} key
   * @return {!Promise<!number>}
   */
  size(key) {
    throw new Error('Size is not overridden!');
  }

  /**
   * @param {!string} key
   * @return {!Promise}
   */
  remove(key) {
    throw new Error('Remove is not overridden!');
  }
}

module.exports = BaseCache;
