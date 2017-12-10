const _ = require('lodash');
const { hash, jsonStableReplacer } = require('../lib/helper');

const OMITTED_HASH_FIELDS = [
  'priority',
  'allowedDomains',
  'delay',
  'retryCount',
  'retryDelay',
  'jQuery',
  'username',
  'password',
  'preRequest',
  'evaluatePage',
  'onSuccess',
  'onError',
  'timeout',
  'waitUntil',
];
const MAX_LENGTH = 10;

class BaseCache {
  constructor(settings) {
    this._settings = settings;
  }

  /**
   * Initializing the cache storage
   * @return {Promise} resolves when init operation completed
   * @interface
   */
  init() {
    throw new Error('Init is not overridden!');
  }

  /**
   * Closing the cache storage
   * @return {Promise} resolves when close operation completed
   * @interface
   */
  close() {
    throw new Error('Close is not overridden!');
  }

  /**
   * Clearing the cache storage
   * @return {Promise} resolves when clear operation completed
   * @interface
   */
  clear() {
    throw new Error('Clear is not overridden!');
  }

  /**
   * Method to check whether the requested options already exists in the cache storage
   * @param {Object} options
   * @return {Promise} resolves whether the requested options already exists
   * @interface
   */
  exists() {
    throw new Error('Get is not overridden!');
  }

  /**
   * Method to set the requested options to the cache storage
   * @param {Object} options
   * @return {Promise} resolves when set operation completed
   * @interface
   */
  set() {
    throw new Error('Set is not overridden!');
  }

  /**
   * Method to remove already requested option from the cache storage
   * @param {Object} options
   * @return {Promise} resolves when remove operation completed
   * @interface
   */
  remove() {
    throw new Error('Remove is not overridden!');
  }

  /**
   * Method to check whether the requested options already exists in the cache storage
   * @param {Object} options
   * @return {String} session cache key for the option
   * @static
   */
  static key(options) {
    const json = JSON.stringify(_.omit(options, OMITTED_HASH_FIELDS), jsonStableReplacer);
    return hash(json).substring(0, MAX_LENGTH);
  }
}

module.exports = BaseCache;
