const { inspect } = require('util');
const { parse, resolve, format } = require('url');
const crypto = require('crypto');
const {
  pick,
  isPlainObject,
  trim,
  startsWith,
  includes,
  isString,
  isFunction,
} = require('lodash');
const debug = require('debug');

const debugConsole = debug('hccrawler:console');
const debugDialog = debug('hccrawler:dialog');

const PICKED_OPTION_FIELDS = [
  'url',
  'device',
  'userAgent',
  'extraHeaders',
];
const MAX_KEY_LENGTH = 10;

class Helper {
  /**
   * @param {!number} milliseconds
   * @return {!Promise}
   */
  static delay(milliseconds) {
    return new Promise(_resolve => setTimeout(_resolve, milliseconds));
  }

  /**
   * @param {!string} src
   * @return {!string}
   */
  static hash(src) {
    const md5hash = crypto.createHash('md5');
    md5hash.update(src, 'binary');
    return md5hash.digest('hex');
  }

  /**
   * @param {!Object} options
   * @return {!string}
   */
  static generateKey(options) {
    const json = JSON.stringify(pick(options, PICKED_OPTION_FIELDS), Helper.jsonStableReplacer);
    return Helper.hash(json).substring(0, MAX_KEY_LENGTH);
  }

  /**
   * @param {!string} key
   * @param {?*} val
   * @return {!Object}
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
   * @return {!string}
   */
  static resolveUrl(url, baseUrl) {
    url = trim(url);
    if (!url) return null;
    if (startsWith(url, '#')) return null;
    const { protocol } = parse(url);
    if (includes(['http:', 'https:'], protocol)) {
      return url.split('#')[0];
    } else if (!protocol) {
      return resolve(baseUrl, url).split('#')[0];
    }
    return null;
  }

  /**
   * @param {!string} value
   * @param {!string=} separator
   * @return {!string}
   */
  static escapeQuotes(value, separator = ',') {
    if (value === null || value === undefined) return '';
    const regExp = new RegExp(`["${separator}\\r\\n]`);
    if (regExp.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  }

  /**
   * @param {!string} url
   * @return {!string}
   * @private
   */
  static getRobotsUrl(url) {
    const { protocol, host } = parse(url);
    return format({ protocol, host, pathname: '/robots.txt' });
  }

  // Ported from http://en.cppreference.com/w/cpp/algorithm/lower_bound
  static lowerBound(array, value, comp) {
    let first = 0;
    let count = array.length;
    while (count > 0) {
      const step = (count / 2) | 0;
      const it = first + step;
      if (comp(array[it], value) <= 0) {
        first += it;
        count -= step + 1;
      } else {
        count = step;
      }
    }
    return first;
  }

  /**
   * @param {!Object} classType
   */
  static tracePublicAPI(classType) {
    const className = classType.prototype.constructor.name.toLowerCase();
    const debugClass = debug(`hccrawler:${className}`);
    Reflect.ownKeys(classType.prototype).forEach(methodName => {
      if (methodName === 'constructor' || !isString(methodName) || startsWith(methodName, '_')) return;
      const method = Reflect.get(classType.prototype, methodName);
      if (!isFunction(method)) return;
      Reflect.set(classType.prototype, methodName, function (...args) {
        const argsText = args.map(Helper.stringifyArgument).join(', ');
        debugClass(`${methodName}(${argsText})`);
        return method.call(this, ...args);
      });
    });
    if (classType.Events) {
      const method = Reflect.get(classType.prototype, 'emit');
      Reflect.set(classType.prototype, 'emit', function (event, ...args) {
        const argsText = [JSON.stringify(event)].concat(args.map(Helper.stringifyArgument)).join(', ');
        debugClass(`emit(${argsText})`);
        return method.call(this, event, ...args);
      });
    }
  }

  /**
   * @param {!Object} arg
   * @return {!string}
   */
  static stringifyArgument(arg) {
    return inspect(arg)
      .split('\n')
      .map(line => trim(line))
      .join(' ');
  }

  /**
   * @param {!string} msg
   */
  static debugConsole(msg) {
    debugConsole(msg);
  }

  /**
   * @param {!string} msg
   */
  static debugDialog(msg) {
    debugDialog(msg);
  }
}

module.exports = Helper;
