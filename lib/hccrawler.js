const EventEmitter = require('events');
const { parse } = require('url');
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
const PQueue = require('p-queue');
const Puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const {
  delay,
  generateKey,
  tracePublicAPI,
} = require('./helper');
const Crawler = require('./crawler');
const SessionCache = require('../cache/session');

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

class HCCrawler extends EventEmitter {
  /**
   * @param {Object=} options
   * @return {Promise}
   */
  static connect(options) {
    return Puppeteer.connect(pick(options, PUPPETEER_CONNECT_OPTIONS))
      .then(browser => new HCCrawler(browser, omit(options, PUPPETEER_CONNECT_OPTIONS)))
      .then(crawler => crawler.init().then(() => crawler));
  }

  /**
   * @param {Object=} options
   * @return {Promise}
   */
  static launch(options) {
    return Puppeteer.launch(pick(options, PUPPETEER_LAUNCH_OPTIONS))
      .then(browser => new HCCrawler(browser, omit(options, PUPPETEER_LAUNCH_OPTIONS)))
      .then(crawler => crawler.init().then(() => crawler));
  }

  /**
   * @return {string}
   */
  static executablePath() {
    return Puppeteer.executablePath();
  }

  /**
   * @param {!Puppeteer.Browser} browser
   * @param {!Object} options
   */
  constructor(browser, options) {
    super();
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
    this._pQueue = new PQueue({ concurrency: this._options.maxConcurrency });
    this._requestedCount = 0;
    this._exportHeader();
    this._browser.on('disconnected', () => void this.emit(HCCrawler.Events.Disconnected));
  }

  /**
   * @return {Promise}
   */
  init() {
    if (!this._options.cache) return Promise.resolve();
    return this._options.cache.init();
  }

  /**
   * @param {Object|Array|string} options
   */
  queue(options) {
    each(isArray(options) ? options : [options], _options => {
      let mergedOptions = isString(_options) ? { url: _options } : _options;
      mergedOptions = extend({}, this._options, mergedOptions);
      if (!mergedOptions.url) throw new Error('Url must be defined!');
      if (mergedOptions.device && !includes(deviceNames, mergedOptions.device)) throw new Error('Specified device is not supported!');
      if (mergedOptions.delay > 0 && mergedOptions.maxConcurrency !== 1) throw new Error('Max concurrency must be 1 when delay is set!');
      this._pQueue.add(() => this._request(omit(mergedOptions, CONSTRUCTOR_OPTIONS)), {
        priority: mergedOptions.priority,
      });
    });
  }

  /**
   * @return {Promise}
   */
  close() {
    return Promise.all([
      this._browser.close(),
      this._endExporter(),
      this._clearCacheOnEnd().then(() => this._closeCache()),
    ]);
  }

  /**
   * @return {Promise}
   */
  disconnect() {
    return Promise.all([
      this._browser.disconnect(),
      this._endExporter(),
      this._clearCacheOnEnd().then(() => this._closeCache()),
    ]);
  }

  /**
   * @return {Promise}
   */
  version() {
    return this._browser.version();
  }

  /**
   * @return {Promise}
   */
  wsEndpoint() {
    return this._browser.wsEndpoint();
  }

  /**
   * @return {Promise}
   */
  onIdle() {
    return this._pQueue.onIdle();
  }

  /**
   * @param {!number} maxRequest
   */
  setMaxRequest(maxRequest) {
    this._options.maxRequest = maxRequest;
  }

  pause() {
    this._pQueue.pause();
  }

  resume() {
    this._pQueue.start();
  }

  /**
   * @return {Promise}
   */
  clearCache() {
    if (!this._options.cache) return Promise.resolve();
    return this._options.cache.clear();
  }

  /**
   * @return {bolean}
   */
  isPaused() {
    return this._pQueue.isPaused;
  }

  /**
   * @return {number}
   */
  queueSize() {
    return this._pQueue.size;
  }

  /**
   * @return {number}
   */
  pendingQueueSize() {
    return this._pQueue.pending;
  }

  /**
   * @return {number}
   */
  requestedCount() {
    return this._requestedCount;
  }

  /**
   * @param {!Object} options
   * @param {number=} depth
   * @param {number=} retryCount
   * @param {number} retryCount
   * @private
   */
  _request(options, depth = 1, retryCount = 0) {
    if (retryCount === 0) this.emit(HCCrawler.Events.RequestStarted, options);
    if (!this._checkAllowedDomains(options)) {
      this.emit(HCCrawler.Events.RequestSkipped, options);
      return Promise.resolve();
    }
    return Promise.all([
      this._checkExists(options),
      this._preRequest(options),
    ])
      .then(([exists, shouldRequest]) => {
        if (exists || !shouldRequest) {
          this.emit(HCCrawler.Events.RequestSkipped, options);
          return Promise.resolve();
        }
        return this._newPage(options)
          .then(crawler => (
            crawler.crawl()
              .then(res => {
                this.emit(HCCrawler.Events.RequestFinished, options);
                res.response = pick(res.response, RESPONSE_FIELDS);
                res.options = options;
                const onSuccess = options.onSuccess || noop;
                return Promise.resolve(onSuccess(res))
                  .then(() => void this._exportLine(res))
                  .then(() => void this._followLinks(res.links, options, depth))
                  .then(() => void this._checkRequestCount())
                  .then(() => crawler.close())
                  .then(() => delay(options.delay));
              })
              .catch(error => {
                this.emit(HCCrawler.Events.RequestFailed, error);
                if (retryCount >= options.retryCount) throw error;
                return crawler.close()
                  .then(() => delay(options.retryDelay))
                  .then(() => this._removeExists(options))
                  .then(() => this._request(options, depth, retryCount + 1));
              })
              .catch(error => {
                const onError = options.onError || noop;
                return Promise.resolve(onError(error))
                  .then(() => this._checkRequestCount())
                  .then(() => crawler.close())
                  .then(() => delay(options.delay));
              })
          ));
      });
  }

  /**
   * @param {!Object} options
   * @return {boolean}
   * @private
   */
  _checkAllowedDomains(options) {
    const { hostname } = parse(options.url);
    if (!options.allowedDomains) return true;
    return some(options.allowedDomains, domain => endsWith(hostname, domain));
  }

  /**
   * @param {!Object} options
   * @return {Promise}
   * @private
   */
  _checkExists(options) {
    if (!this._options.cache) return Promise.resolve(false);
    const key = generateKey(options);
    return this._options.cache.exists(key)
      .then(exists => this._options.cache.set(key).then(() => exists));
  }

  /**
   * @param {!Object} options
   * @return {Promise}
   * @private
   */
  _removeExists(options) {
    if (!this._options.cache) return Promise.resolve(false);
    const key = generateKey(options);
    return this._options.cache.remove(key);
  }

  /**
   * @param {!Object} options
   * @return {Promise}
   * @private
   */
  _preRequest(options) {
    if (!options.preRequest) return Promise.resolve(true);
    return Promise.resolve(options.preRequest(options));
  }

  /**
   * @param {!Object} options
   * @return {Promise}
   * @private
   */
  _newPage(options) {
    return this._browser.newPage()
      .then(page => new Crawler(page, options));
  }

  /**
   * @param {!Array<!string>} links
   * @param {!Object} options
   * @param {number} depth
   * @private
   */
  _followLinks(links, options, depth) {
    if (depth >= options.maxDepth) {
      this.emit(HCCrawler.Events.MaxDepthReached);
      return;
    }
    each(links, link => {
      const _options = extend({}, options, { url: link });
      this._pQueue.add(() => this._request(_options, depth + 1), {
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
      this.emit(HCCrawler.Events.MaxRequestReached);
      this.pause();
    }
  }

  /**
   * @private
   */
  _exportHeader() {
    if (!this._options.exporter) return;
    this._options.exporter.writeHeader();
  }

  /**
   * @param {!Object} res
   * @private
   */
  _exportLine(res) {
    if (!this._options.exporter) return;
    this._options.exporter.writeLine(res);
  }

  /**
   * @return {Promise}
   * @private
   */
  _endExporter() {
    if (!this._options.exporter) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this._options.exporter.onEnd()
        .then(resolve)
        .catch(reject);
      this._options.exporter.writeFooter();
      this._options.exporter.end();
    });
  }

  /**
   * @return {Promise}
   * @private
   */
  _clearCacheOnEnd() {
    if (!this._options.persistCache) return this.clearCache();
    return Promise.resolve();
  }

  /**
   * @return {Promise}
   * @private
   */
  _closeCache() {
    if (!this._options.cache) return Promise.resolve();
    return this._options.cache.close();
  }
}

HCCrawler.Events = {
  RequestStarted: 'requeststarted',
  RequestSkipped: 'requestskipped',
  RequestFinished: 'requestfinished',
  RequestFailed: 'requestfailed',
  MaxDepthReached: 'maxdepthreached',
  MaxRequestReached: 'maxrequestreached',
  Disconnected: 'disconnected',
};

tracePublicAPI(HCCrawler);

module.exports = HCCrawler;
