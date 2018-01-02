const BaseCache = require('./base');
const redis = require('redis');

/**
 * @implements {BaseCache}
 */
class RedisCache extends BaseCache {
  /**
   * @override
   * @return {!Promise}
   */
  init() {
    this._client = redis.createClient(this._settings);
    return Promise.resolve();
  }

  /**
   * @return {!Promise}
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
   * @return {!Promise}
   * @override
   */
  close() {
    this._client.quit();
    return Promise.resolve();
  }

  /**
   * @param {!string} key
   * @return {!Promise}
   * @override
   */
  get(key) {
    return new Promise((resolve, reject) => {
      this._client.get(key, (error, value) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(value || null);
      });
    });
  }

  /**
   * @param {!string} key
   * @param {!string} value
   * @return {!Promise}
   * @override
   */
  set(key, value) {
    return new Promise((resolve, reject) => {
      this._client.set(key, value, error => {
        if (error) {
          reject(error);
          return;
        }
        if (!this._settings.expire) {
          resolve();
          return;
        }
        this._client.expire(key, this._settings.expire, _error => {
          if (_error) {
            reject(_error);
            return;
          }
          resolve();
        });
      });
    });
  }

  /**
   * @param {!string} key
   * @return {!Promise}
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
