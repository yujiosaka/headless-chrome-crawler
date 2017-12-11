const BaseCache = require('./base');

class SessionCache extends BaseCache {
  /**
   * @override
   */
  init() {
    this._storage = {};
    return Promise.resolve();
  }

  /**
   * @override
   */
  clear() {
    this._storage = {};
    return Promise.resolve();
  }

  /**
   * @override
   */
  close() {
    this._storage = {};
    return Promise.resolve();
  }

  /**
   * @override
   */
  exists(key) {
    return Promise.resolve(this._storage[key] || false);
  }

  /**
   * @override
   */
  set(key) {
    this._storage[key] = true;
    return Promise.resolve();
  }

  /**
   * @override
   */
  remove(key) {
    delete this._storage[key];
    return Promise.resolve();
  }
}

module.exports = SessionCache;
