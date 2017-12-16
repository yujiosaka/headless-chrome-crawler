const URL = require('url');
const PQueue = require('p-queue');
const Puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const Crawler = require('./crawler');
const {
  pick,
  omit,
  extend,
  each,
  includes,
  noop,
  some,
  endsWith,
  isString,
  isArray,
} = require('lodash');
const SessionCache = require('../cache/session');
const { delay, generateKey, debugRequest } = require('./helper');

const PUPPETEER_CONNECT_OPTIONS = [
  'browserWSEndpoint',
  'ignoreHTTPSErrors',
];
const PUPPETEER_LAUNCH_OPTIONS = [
  'ignoreHTTPSErrors',
  'headless',
  'executablePath',
  'slowMo',
  'args',
  'handleSIGINT',
  'handleSIGTERM',
  'handleSIGHUP',
  'timeout',
  'dumpio',
  'userDataDir',
  'env',
  'devtools',
];
const CONSTRUCTOR_OPTIONS = [
  'maxConcurrency',
  'maxRequest',
  'cache',
  'persistCache',
];
const RESPONSE_FIELDS = [
  'ok',
  'url',
  'status',
  'headers',
];

const deviceNames = Object.keys(devices);

class HCCrawler {
  /**
   * Connect to an existing Chromium instance
   * @param {Object} options
   * @return {Promise} resolved after successfully connecting a browser
   * @static
   */
  static connect(options) {
    return Puppeteer.connect(pick(options, PUPPETEER_CONNECT_OPTIONS))
      .then(browser => new HCCrawler(browser, omit(options, PUPPETEER_CONNECT_OPTIONS)))
      .then(crawler => crawler._init().then(() => crawler));
  }

  /**
   * Launch a Chromium instance
   * @param {Object} options
   * @return {Promise} resolved after successfully launching a browser
   * @static
   */
  static launch(options) {
    return Puppeteer.launch(pick(options, PUPPETEER_LAUNCH_OPTIONS))
      .then(browser => new HCCrawler(browser, omit(options, PUPPETEER_LAUNCH_OPTIONS)))
      .then(crawler => crawler._init().then(() => crawler));
  }

  /**
   * A path where Puppeteer expects to find bundled Chromium.
   * @return {String} executable path
   * @static
   */
  static executablePath() {
    return Puppeteer.executablePath();
  }

  /**
   * @param {Puppeteer.Browser} browser
   * @param {Object} options
   */
  constructor(browser, options) {
    this._browser = browser;
    this._options = extend({
      maxDepth: 1,
      maxConcurrency: 10,
      maxRequest: 0,
      priority: 1,
      delay: 0,
      retryCount: 3,
      retryDelay: 10000,
      jQuery: true,
      cache: new SessionCache(),
      persistCache: false,
      screenshot: null,
    }, options);
    this._pQueue = new PQueue({
      concurrency: this._options.maxConcurrency,
    });
    this._requestedCount = 0;
  }

  /**
   * Queue requests
   * @param {Object|Array|string} options
   */
  queue(options) {
    each(isArray(options) ? options : [options], _options => {
      let mergedOptions = isString(_options) ? { url: _options } : _options;
      mergedOptions = extend({}, this._options, mergedOptions);
      this._validateOptions(mergedOptions);
      this._pQueue.add(() => this._request(omit(mergedOptions, CONSTRUCTOR_OPTIONS)), {
        priority: mergedOptions.priority,
      });
    });
  }

  /**
   * Close the crawler
   * @return {Promise} resolved when ther crawler is closed
   */
  close() {
    return Promise.all([
      this._browser.close(),
      this._clearCacheOnEnd().then(() => this._closeCache()),
    ]);
  }

  /**
   * Disconnect from the Chromium instance
   * @return {Promise} resolved when ther crawler disconnected
   */
  disconnect() {
    return Promise.all([
      this._browser.disconnect(),
      this._clearCacheOnEnd().then(() => this._closeCache()),
    ]);
  }

  /**
   * @return {Promise} resolved with HeadlessChrome/Chromium version
   */
  version() {
    return this._browser.version();
  }

  /**
   * @return {Promise} resolved with websocket url
   */
  wsEndpoint() {
    return this._browser.wsEndpoint();
  }

  /**
   * @return {Promise} resolved when queue is empty
   */
  onIdle() {
    return this._pQueue.onIdle();
  }

  /**
   * Set max request option after launch
   */
  setMaxRequest(maxRequest) {
    this._options.maxRequest = maxRequest;
  }

  /**
   * Pause request temporary
   */
  pause() {
    return this._pQueue.pause();
  }

  /**
   * Resume request temporary
   */
  resume() {
    return this._pQueue.start();
  }

  /**
   * Clear cache
   * @return {Promise} resolved when cache has been cleared
   */
  clearCache() {
    if (!this._options.cache) return Promise.resolve();
    return this._options.cache.clear();
  }

  /**
   * Get paused status
   * @return {bolean} paused
   * @readonly
   */
  get isPaused() {
    return this._pQueue.isPaused();
  }

  /**
   * Get the queue size
   * @return {number} queue size
   * @readonly
   */
  get queueSize() {
    return this._pQueue.size;
  }

  /**
   * Get the pending count
   * @return {number} pending count
   * @readonly
   */
  get pendingQueueSize() {
    return this._pQueue.pending;
  }

  /**
   * Get the requested count
   * @return {number} requested count
   * @readonly
   */
  get requestedCount() {
    return this._requestedCount;
  }

  /**
   * @return {Promise} resolved when initialization completed
   * @private
   */
  _init() {
    if (!this._options.cache) return Promise.resolve();
    return this._options.cache.init();
  }

  /**
   * @param {Object} options
   * @private
   */
  _validateOptions(options) {
    if (!options.url) throw new Error('Url must be defined!');
    if (!options.evaluatePage) throw new Error('Evaluate page function must be defined!');
    if (!options.onSuccess) throw new Error('On success function must be defined!');
    if (options.device && !includes(deviceNames, options.device)) throw new Error('Specified device is not supported!');
    if (options.delay > 0 && options.maxConcurrency !== 1) throw new Error('Max concurrency must be 1 when delay is set!');
  }

  /**
   * @param {Object} options
   * @param {number} retryCount
   * @private
   */
  _request(options, depth = 1, retryCount = 0) {
    if (retryCount === 0) debugRequest(`Start requesting ${options.url}`);
    if (!this._checkAllowedDomains(options)) {
      debugRequest(`Skip requesting ${options.url}`);
      return Promise.resolve();
    }
    return Promise.all([
      this._checkExists(options),
      this._preRequest(options),
    ])
      .then(([exists, shouldRequest]) => {
        if (exists || !shouldRequest) {
          debugRequest(`Skip requesting ${options.url}`);
          return Promise.resolve();
        }
        return this._newPage(options)
          .then(crawler => (
            crawler.crawl()
              .then(res => (
                Promise.resolve(options.onSuccess({
                  response: pick(res.response, RESPONSE_FIELDS),
                  result: res.result,
                  screenshot: res.screenshot,
                  links: res.links,
                  options,
                }))
                  .then(() => crawler.close())
                  .then(() => this._followLinks(res.links, options, depth))
              ))
          ))
          .then(() => void debugRequest(`End requesting ${this._options.url}`))
          .then(() => delay(options.delay))
          .then(() => void this._checkRequestCount());
      })
      .catch(error => {
        if (retryCount >= options.retryCount) throw new Error(`Retry give-up for requesting ${options.url}!`, error);
        debugRequest(`Retry requesting ${options.url} ${retryCount + 1} times`);
        return delay(options.retryDelay)
          .then(() => this._removeExists(options))
          .then(() => this._request(options, depth, retryCount + 1));
      })
      .catch(error => {
        debugRequest(`Retry give-up for requesting ${options.url} after ${retryCount} tries`);
        const onError = options.onError || noop;
        return Promise.resolve(onError(error));
      });
  }

  /**
   * @private
   * @return {boolean} whether target url is allowed
   */
  _checkAllowedDomains(options) {
    const { hostname } = URL.parse(options.url);
    if (!options.allowedDomains) return true;
    return some(options.allowedDomains, domain => endsWith(hostname, domain));
  }

  /**
   * @param {Object} options
   * @return {Promise} whether the requested options already exists in the cache storage
   * @private
   */
  _checkExists(options) {
    if (!this._options.cache) return Promise.resolve(false);
    const key = generateKey(options);
    return this._options.cache.exists(key)
      .then(exists => this._options.cache.set(key).then(() => exists));
  }

  /**
   * @param {Object} options
   * @return {Promise} resolved when already accessed options are removed
   * @private
   */
  _removeExists(options) {
    if (!this._options.cache) return Promise.resolve(false);
    const key = generateKey(options);
    return this._options.cache.remove(key);
  }

  /**
   * @param {Puppeteer.Page} page
   * @param {Object} options
   * @return {Promise} resolved whether request should be sent
   * @private
   */
  _preRequest(options) {
    if (!options.preRequest) return Promise.resolve(true);
    return Promise.resolve(options.preRequest(options));
  }

  /**
   * @param {Object} options
   * @return {Promise} resolved when successfully opened a page
   * @private
   */
  _newPage(options) {
    return this._browser.newPage()
      .then(page => new Crawler(page, options));
  }

  /**
   * @private
   */
  _followLinks(links, options, depth) {
    if (depth >= options.maxDepth) return;
    each(links, link => {
      const _options = extend({}, options, { url: link });
      this._pQueue.add(() => this._request(_options, depth), {
        priority: _options.priority,
      });
    });
  }

  /**
   * @private
   */
  _checkRequestCount() {
    this._requestedCount += 1;
    if (this._options.maxRequest && this._requestedCount >= this._options.maxRequest) {
      this.pause();
    }
  }

  /**
   * @return {Promise} resolved when clear cache
   * @private
   */
  _clearCacheOnEnd() {
    if (!this._options.persistCache) return this.clearCache();
    return Promise.resolve();
  }

  /**
   * @return {Promise} resolved when cache has been closed
   * @private
   */
  _closeCache() {
    if (!this._options.cache) return Promise.resolve();
    return this._options.cache.close();
  }
}

module.exports = HCCrawler;
