const _ = require('lodash');
const PQueue = require('p-queue');
const Puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const Crawler = require('./crawler');
const { delay, debugRequest } = require('./helper');

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
const HCCRAWLER_OPTIONS = [
  'maxConcurrency',
  'maxRequest',
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
    return Puppeteer.connect(_.pick(options, PUPPETEER_CONNECT_OPTIONS))
      .then(browser => new HCCrawler(browser, _.omit(options, PUPPETEER_CONNECT_OPTIONS)));
  }

  /**
   * Launch a Chromium instance
   * @param {Object} options
   * @return {Promise} resolved after successfully launching a browser
   * @static
   */
  static launch(options) {
    return Puppeteer.launch(_.pick(options, PUPPETEER_LAUNCH_OPTIONS))
      .then(browser => new HCCrawler(browser, _.omit(options, PUPPETEER_LAUNCH_OPTIONS)));
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
    this._options = _.extend({
      maxConcurrency: 10,
      maxRequest: 0,
      priority: 1,
      delay: 0,
      retryCount: 3,
      retryDelay: 10000,
      jQuery: true,
    }, options);
    this._pQueue = new PQueue({
      concurrency: this._options.maxConcurrency,
    });
    this._requestCount = 0;
    this._resolveOnEnd = () => {
      this._pQueue.pause();
    };
  }

  /**
   * Queue requests
   * @param {Object|Array|string} options
   */
  queue(options) {
    _.each(_.isArray(options) ? options : [options], _options => {
      let mergedOptions = _.isString(_options) ? { url: _options } : _options;
      mergedOptions = _.extend({}, this._options, mergedOptions);
      this._validateOptions(mergedOptions);
      this._pQueue.add(() => this._request(_.omit(mergedOptions, HCCRAWLER_OPTIONS)), {
        priority: mergedOptions.priority,
      });
    });
  }

  /**
   * Close the crawler
   * @return {Promise} resolved when ther crawler is closed
   */
  close() {
    return this._browser.close();
  }

  /**
   * Disconnect from the Chromium instance
   * @return {Promise} resolved when ther crawler disconnected
   */
  disconnect() {
    return this._browser.disconnect();
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
   * @return {Promise} resolved when reached the max request
   */
  onEnd() {
    return new Promise(resolve => {
      const oldResolveOnEnd = this._resolveOnEnd;
      this._resolveOnEnd = () => {
        oldResolveOnEnd();
        resolve();
      };
    });
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
   * @param {Object} options
   * @private
   */
  _validateOptions(options) {
    if (!options.url) throw new Error('Url must be defined!');
    if (!options.evaluatePage) throw new Error('Evaluate page function must be defined!');
    if (!options.onSuccess) throw new Error('On success function must be defined!');
    if (options.device && !_.includes(deviceNames, options.device)) throw new Error('Specified device is not supported!');
    if (options.delay > 0 && options.maxConcurrency !== 1) throw new Error('Max concurrency must be 1 when delay is set!');
  }

  /**
   * @param {Object} options
   * @param {number} retryCount
   * @private
   */
  _request(options, retryCount = 0) {
    if (retryCount === 0) debugRequest(`Start requesting ${options.url}`);
    return this._preRequest(options)
      .then(shouldRequest => {
        if (!shouldRequest) {
          debugRequest(`Skip requesting ${options.url}`);
          return Promise.resolve();
        }
        return this._newPage(options)
          .then(crawler => crawler.crawl())
          .then(() => delay(options.delay))
          .then(() => void this._checkRequestCount());
      })
      .catch(err => {
        if (retryCount >= options.retryCount) throw new Error(`Retry give-up for requesting ${options.url}!`, err);
        debugRequest(`Retry requesting ${options.url} ${retryCount + 1} times`);
        return delay(options.retryDelay).then(() => this._request(options, retryCount + 1));
      })
      .catch(err => {
        debugRequest(`Retry give-up for requesting ${options.url} after ${retryCount} tries`);
        const onError = options.onError || _.noop;
        return onError(err);
      });
  }

  /**
   * @param {Puppeteer.Page} page
   * @param {Object} options
   * @return {Promise} resolved whether request should be sent
   * @private
   */
  _preRequest(options) {
    return Promise.resolve(options.preRequest ? options.preRequest(options) : true);
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
  _checkRequestCount() {
    this._requestCount += 1;
    if (this._options.maxRequest && this._requestCount >= this._options.maxRequest) {
      this._resolveOnEnd();
    }
  }
}

module.exports = HCCrawler;
