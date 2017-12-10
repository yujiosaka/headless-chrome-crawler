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
  exists(options) {
    return Promise.resolve(this._storage[BaseCache.key(options)] || false);
  }

  /**
   * @override
   */
  set(options) {
    this._storage[BaseCache.key(options)] = true;
    return Promise.resolve();
  }

  /**
   * @override
   */
  remove(options) {
    delete this._storage[BaseCache.key(options)];
    return Promise.resolve();
  }
}

module.exports = SessionCache;
