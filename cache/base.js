/**
 * @interface
 */
class BaseCache {
  /**
   * @param {!Object} settings
   */
  constructor(settings) {
    this._settings = settings;
  }

  /**
   * @return {Promise}
   */
  init() {
    throw new Error('Init is not overridden!');
  }

  /**
   * @return {Promise}
   */
  close() {
    throw new Error('Close is not overridden!');
  }

  /**
   * @return {Promise}
   */
  clear() {
    throw new Error('Clear is not overridden!');
  }

  /**
   * @param {!string} key
   * @return {Promise}
   */
  exists() {
    throw new Error('Get is not overridden!');
  }

  /**
   * @param {!string} key
   * @return {Promise}
   */
  set() {
    throw new Error('Set is not overridden!');
  }

  /**
   * @param {!string} key
   * @return {Promise}
   */
  remove() {
    throw new Error('Remove is not overridden!');
  }
}

module.exports = BaseCache;
