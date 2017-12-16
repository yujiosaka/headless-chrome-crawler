const URL = require('url');
const crypto = require('crypto');
const {
  omit,
  isPlainObject,
  trim,
  startsWith,
  includes,
} = require('lodash');
const debugRequest = require('debug')('hccrawler:request');
const debugBrowser = require('debug')('hccrawler:browser');

const OMITTED_HASH_FIELDS = [
  'priority',
  'allowedDomains',
  'delay',
  'retryCount',
  'retryDelay',
  'jQuery',
  'screenshot',
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
   * @param {!number} milliseconds
   * @return {Promise}
   */
  static delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  /**
   * @param {!string} src
   * @return {string}
   */
  static hash(src) {
    const md5hash = crypto.createHash('md5');
    md5hash.update(src, 'binary');
    return md5hash.digest('hex');
  }

  /**
   * @param {!Object} options
   * @return {string}
   */
  static generateKey(options) {
    const json = JSON.stringify(omit(options, OMITTED_HASH_FIELDS), Helper.jsonStableReplacer);
    return Helper.hash(json).substring(0, MAX_LENGTH);
  }

  /**
   * @param {!string} key
   * @param {!*} val
   * @return {*}
   */
  static jsonStableReplacer(key, val) {
    if (!isPlainObject(val)) return val;
    return Object.keys(val).sort().reduce((obj, _key) => {
      obj[_key] = val[_key];
      return obj;
    }, {});
  }

  /**
   * @param {!string} url
   * @param {!string} baseUrl
   * @return {string}
   */
  static resolveUrl(url, baseUrl) {
    url = trim(url);
    if (!url) return null;
    if (startsWith(url, '#')) return null;
    const { protocol } = URL.parse(url);
    if (includes(['http:', 'https:'], protocol)) {
      return url.split('#')[0];
    } else if (!protocol) {
      return URL.resolve(baseUrl, url).split('#')[0];
    }
    return null;
  }

  /**
   * @param {!string} msg
   */
  static debugRequest(msg) {
    debugRequest(msg);
  }

  /**
   * @param {!string} msg
   */
  static debugBrowser(msg) {
    debugBrowser(msg);
  }
}

module.exports = Helper;
