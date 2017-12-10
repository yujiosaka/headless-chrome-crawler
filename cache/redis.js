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
  exists(options) {
    return new Promise((resolve, reject) => {
      this._client.exists(BaseCache.key(options), (error, exists) => {
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
  set(options) {
    return new Promise((resolve, reject) => {
      this._client.set(BaseCache.key(options), '1', error => {
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
  remove(options) {
    return new Promise((resolve, reject) => {
      this._client.del(BaseCache.key(options), error => {
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
