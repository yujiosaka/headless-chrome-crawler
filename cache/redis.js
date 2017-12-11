const BaseCache = require('./base');
const redis = require('redis');

class RedisCache extends BaseCache {
  /**
   * @override
   */
  init() {
    this._client = redis.createClient(this._settings);
    return Promise.resolve();
  }

  /**
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
   * @override
   */
  close() {
    this._client.quit();
    return Promise.resolve();
  }

  /**
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
