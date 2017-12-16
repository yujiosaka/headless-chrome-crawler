const BaseCache = require('./base');
const redis = require('redis');

/**
 * @implements {BaseCache}
 */
class RedisCache extends BaseCache {
  /**
   * @override
   * @return {Promise}
   */
  init() {
    this._client = redis.createClient(this._settings);
    return Promise.resolve();
  }

  /**
   * @return {Promise}
   * @override
   */
  clear() {
    return new Promise((resolve, reject) => {
      this._client.flushdb(error => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * @return {Promise}
   * @override
   */
  close() {
    this._client.quit();
    return Promise.resolve();
  }

  /**
   * @param {!string} key
   * @return {Promise}
   * @override
   */
  exists(key) {
    return new Promise((resolve, reject) => {
      this._client.exists(key, (error, exists) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(exists);
      });
    });
  }

  /**
   * @param {!string} key
   * @return {Promise}
   * @override
   */
  set(key) {
    return new Promise((resolve, reject) => {
      this._client.set(key, '1', error => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  /**
   * @param {!string} key
   * @return {Promise}
   * @override
   */
  remove(key) {
    return new Promise((resolve, reject) => {
      this._client.del(key, error => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
}

module.exports = RedisCache;
