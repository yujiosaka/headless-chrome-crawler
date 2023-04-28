const { lowerBound } = require('../lib/helper');
const BaseCache = require('./base');

/**
 * @implements {BaseCache}
 */
class SessionCache extends BaseCache {
  /**
   * @return {!Promise}
   * @override
   */
  init() {
    this._storage = new Map();
    return Promise.resolve();
  }

  /**
   * @return {!Promise}
   * @override
   */
  clear() {
    this._storage.clear();
    return Promise.resolve();
  }

  /**
   * @return {!Promise}
   * @override
   */
  close() {
    return Promise.resolve();
  }

  /**
   * @param {!string} key
   * @return {!Promise}
   * @override
   */
  get(key) {
    return Promise.resolve(this._storage.get(key) || null);
  }

  /**
   * @param {!string} key
   * @param {!string} value
   * @return {!Promise}
   * @override
   */
  set(key, value) {
    this._storage.set(key, value);
    return Promise.resolve();
  }

  /**
   * @param {!string} key
   * @param {!string} value
   * @param {!number=} priority
   * @return {!Promise}
   * @override
   */
  enqueue(key, value, priority) {
    const queue = this._storage.get(key) || [];
    const item = { value, priority };
    if (queue.length && queue[queue.length - 1].priority >= priority) {
      queue.push(item);
      this._storage.set(key, queue);
      return Promise.resolve();
    }
    const index = lowerBound(queue, item, (a, b) => b.priority - a.priority);
    queue.splice(index, 0, item);
    this._storage.set(key, queue);
    return Promise.resolve();
  }

  /**
   * @param {!string} key
   * @return {!Promise}
   * @override
   */
  dequeue(key) {
    const queue = this._storage.get(key) || [];
    this._storage.set(key, queue);
    const item = queue.shift();
    if (!item) return Promise.resolve(null);
    return Promise.resolve(item.value);
  }

  /**
   * @param {!string} key
   * @return {!Promise<!number>}
   * @override
   */
  size(key) {
    const queue = this._storage.get(key);
    if (!queue) return Promise.resolve(0);
    return Promise.resolve(queue.length);
  }

  /**
   * @param {!string} key
   * @return {!Promise}
   * @override
   */
  remove(key) {
    this._storage.delete(key);
    return Promise.resolve();
  }
}

module.exports = SessionCache;
