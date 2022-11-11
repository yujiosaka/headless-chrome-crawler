const Redis = require('ioredis').default;
const BaseCache = require('./base');

const DEQUEUE_SCRIPT = `
local queue = redis.call('ZREVRANGE', KEYS[1], 0, 0)[1]\n
if (queue) then\n
  redis.call('ZREM', KEYS[1], queue)\n
end\n
return queue\n
`;

/**
 * @implements {BaseCache}
 */
class RedisCache extends BaseCache {
  /**
   * @override
   * @return {!Promise}
   */
  init() {
    this._client = new Redis(this._settings);
    return Promise.resolve();
  }

  /**
   * @return {!Promise}
   * @override
   */
  clear() {
    return new Promise((resolve, reject) => {
      if (!this._client) return reject(new Error("RedisCache: this._client is undefined"));
      this._client.flushdb(error => {
        if (error) {
          reject(error);
          return;
        }
        resolve(undefined);
      });
    });
  }

  /**
   * @return {!Promise}
   * @override
   */
  close() {
    this._client?.quit();
    return Promise.resolve();
  }

  /**
   * @param {!string} key
   * @return {!Promise}
   * @override
   */
  get(key) {
    return new Promise((resolve, reject) => {
      if (!this._client) return reject(new Error("RedisCache: this._client is undefined"));
      this._client.get(key, (error, json) => {
        if (error) {
          reject(error);
          return;
        }
        try {
          const value = JSON.parse(String(json));
          resolve(value);
        } catch (_error) {
          reject(_error);
        }
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
      let json;
      try {
        json = JSON.stringify(value);
      } catch (error) {
        reject(error);
        return;
      }
      if (!this._client) return reject(new Error("RedisCache: this._client is undefined"));
      this._client.set(key, json, error => {
        if (error) {
          reject(error);
          return;
        }
        if (!this._settings.expire) {
          resolve(undefined);
          return;
        }
        if (!this._client) return reject(new Error("RedisCache: this._client is undefined"));
        this._client.expire(key, this._settings.expire, _error => {
          if (_error) {
            reject(_error);
            return;
          }
          resolve(undefined);
        });
      });
    });
  }

  /**
   * @param {!string} key
   * @param {!string} value
   * @param {!number=} priority
   * @return {!Promise}
   * @override
   */
  enqueue(key, value, priority = 1) {
    return new Promise((resolve, reject) => {
      let json;
      try {
        json = JSON.stringify(value);
      } catch (error) {
        reject(error);
        return;
      }
      if (!this._client) return reject(new Error("RedisCache: this._client is undefined"));
      this._client.zadd(key, priority, json, error => {
        if (error) {
          reject(error);
          return;
        }
        if (!this._settings.expire) {
          resolve(undefined);
          return;
        }
        if (!this._client) return reject(new Error("RedisCache: this._client is undefined"));
        this._client.expire(key, this._settings.expire, _error => {
          if (_error) {
            reject(_error);
            return;
          }
          resolve(undefined);
        });
      });
    });
  }

  /**
   * @param {!string} key
   * @return {!Promise}
   * @override
   */
  dequeue(key) {
    return new Promise((resolve, reject) => {
      if (!this._client) return reject(new Error("RedisCache: this._client is undefined"));
      this._client.eval(DEQUEUE_SCRIPT, 1, key, (error, json) => {
        if (error) {
          reject(error);
          return;
        }
        try {
          const value = JSON.parse(String(json));
          resolve(value);
        } catch (_error) {
          reject(_error);
        }
      });
    });
  }

  /**
   * @param {!string} key
   * @return {!Promise<!number>}
   * @override
   */
  size(key) {
    return new Promise((resolve, reject) => {
      if (!this._client) return reject(new Error("RedisCache: this._client is undefined"));
      this._client.zcount(key, '-inf', 'inf', (error, size) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(size || 0);
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
      if (!this._client) return reject(new Error("RedisCache: this._client is undefined"));
      this._client.del(key, error => {
        if (error) {
          reject(error);
          return;
        }
        resolve(undefined);
      });
    });
  }
}

module.exports = RedisCache;
