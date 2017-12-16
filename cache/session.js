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
    this._storage = {};
    return Promise.resolve();
  }

  /**
   * @return {Promise}
   * @override
   */
  clear() {
    this._storage = {};
    return Promise.resolve();
  }

  /**
   * @return {Promise}
   * @override
   */
  close() {
    this._storage = {};
    return Promise.resolve();
  }

  /**
   * @param {!string} key
   * @return {Promise}
   * @override
   */
  exists(key) {
    return Promise.resolve(this._storage[key] || false);
  }

  /**
   * @param {!string} key
   * @return {Promise}
   * @override
   */
  set(key) {
    this._storage[key] = true;
    return Promise.resolve();
  }

  /**
   * @param {!string} key
   * @return {Promise}
   * @override
   */
  remove(key) {
    delete this._storage[key];
    return Promise.resolve();
  }
}

module.exports = SessionCache;
