const crypto = require('crypto');
const _ = require('lodash');
const debugRequest = require('debug')('hccrawler:request');
const debugBrowser = require('debug')('hccrawler:browser');

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

class Helper {
  /**
   * Wait until specified milliseconds
   * @param {number} milliseconds
   * @return {Promise} resolved after waiting specified milliseconds
   * @static
   */
  static delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  /**
   * Get MD5 hashed hex string
   * @param {String} src
   * @return {String} hashed src
   * @static
   */
  static hash(src) {
    const md5hash = crypto.createHash('md5');
    md5hash.update(src, 'binary');
    return md5hash.digest('hex');
  }

  /**
   * Generate key from options
   * @param {Object} options
   * @return {String} cache key
   * @static
   */
  static generateKey(options) {
    const json = JSON.stringify(_.omit(options, OMITTED_HASH_FIELDS), Helper.jsonStableReplacer);
    return Helper.hash(json).substring(0, MAX_LENGTH);
  }

  /**
   * Get a consistent object for JSON.stringify
   * @param {String} key
   * @param {*} val
   * @return {*} ordered object
   * @static
   */
  static jsonStableReplacer(key, val) {
    if (!_.isPlainObject(val)) return val;
    return Object.keys(val).sort().reduce((obj, _key) => {
      obj[_key] = val[_key]; /* eslint no-param-reassign: 0 */
      return obj;
    }, {});
  }

  /**
   * Debug log for request events
   * @param {string} msg
   * @static
   */
  static debugRequest(msg) {
    debugRequest(msg);
  }

  /**
   * Debug log for browser events
   * @param {string} msg
   * @static
   */
  static debugBrowser(msg) {
    debugBrowser(msg);
  }
}

module.exports = Helper;
