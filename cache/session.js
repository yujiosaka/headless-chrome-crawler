const BaseCache = require('./base');

/**
 * @implements {BaseCache}
 */
class SessionCache extends BaseCache {
  /**
   * @return {Promise}
   * @override
   */
  init() {
    this._storage = new Map();
    return Promise.resolve();
  }

  /**
   * @return {Promise}
   * @override
   */
  clear() {
    this._storage.clear();
    return Promise.resolve();
  }

  /**
   * @return {Promise}
   * @override
   */
  close() {}

  /**
   * @param {!string} key
   * @return {Promise}
   * @override
   */
  get(key) {
    return Promise.resolve(this._storage.get(key) || null);
  }

  /**
   * @param {!string} key
   * @param {!string} value
   * @return {Promise}
   * @override
   */
  set(key, value) {
    this._storage.set(key, value);
    return Promise.resolve();
  }

  /**
   * @param {!string} key
   * @return {Promise}
   * @override
   */
  remove(key) {
    delete this._storage.delete(key);
    return Promise.resolve();
  }
}

module.exports = SessionCache;
