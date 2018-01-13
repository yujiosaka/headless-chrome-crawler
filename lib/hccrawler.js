const EventEmitter = require('events');
const { parse } = require('url');
const {
  pick,
  omit,
  extend,
  each,
  reduce,
  includes,
  some,
  endsWith,
  isString,
  isArray,
} = require('lodash');
const request = require('request-promise');
const robotsParser = require('robots-parser');
const Puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const {
  delay,
  generateKey,
  getRobotsUrl,
  tracePublicAPI,
} = require('./helper');
const PriorityQueue = require('./priority-queue');
const Crawler = require('./crawler');
const SessionCache = require('../cache/session');

const CONNECT_OPTIONS = [
  'browserWSEndpoint',
  'ignoreHTTPSErrors',
];
const LAUNCH_OPTIONS = [
  'ignoreHTTPSErrors',
  'headless',
  'executablePath',
  'slowMo',
  'args',
  'ignoreDefaultArgs',
  'handleSIGINT',
  'handleSIGTERM',
  'handleSIGHUP',
  'timeout',
  'dumpio',
  'userDataDir',
  'env',
  'devtools',
];
const CONSTRUCTOR_OPTIONS = CONNECT_OPTIONS.concat(LAUNCH_OPTIONS).concat([
  'maxConcurrency',
  'maxRequest',
  'cache',
  'exporter',
  'persistCache',
  'preRequest',
  'onSuccess',
  'onError',
]);
const RESPONSE_FIELDS = [
  'ok',
  'url',
  'status',
  'headers',
];
const EMPTY_TXT = '';

const deviceNames = Object.keys(devices);

class HCCrawler extends EventEmitter {
  /**
   * @param {!Object=} options
   * @return {!Promise}
   */
  static connect(options) {
    return Puppeteer.connect(pick(options, CONNECT_OPTIONS))
      .then(browser => new HCCrawler(browser, omit(options, CONNECT_OPTIONS)))
      .then(crawler => crawler.init().then(() => crawler));
  }

  /**
   * @param {!Object=} options
   * @return {!Promise}
   */
  static launch(options) {
    return Puppeteer.launch(pick(options, LAUNCH_OPTIONS))
      .then(browser => new HCCrawler(browser, omit(options, LAUNCH_OPTIONS)))
      .then(crawler => crawler.init().then(() => crawler));
  }

  /**
   * @return {!string}
   */
  static executablePath() {
    return Puppeteer.executablePath();
  }

  /**
   * @return {!Array<!string>}
   */
  static defaultArgs() {
    return Puppeteer.defaultArgs();
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
      priority: 0,
      delay: 0,
      retryCount: 3,
      retryDelay: 10000,
      jQuery: true,
      persistCache: false,
      skipDuplicates: true,
      obeyRobotsTxt: true,
      screenshot: null,
    }, options);
    this._cache = options.cache || new SessionCache();
    this._queue = new PriorityQueue({
      maxConcurrency: this._options.maxConcurrency,
      cache: this._cache,
    });
    this._exporter = options.exporter || null;
    this._requestedCount = 0;
    this._preRequest = options.preRequest || null;
    this._onSuccess = options.onSuccess || null;
    this._onError = options.onError || null;
    this._exportHeader();
    this._queue.on('pull', (...args) => this._onPull(...args));
    this._browser.on('disconnected', () => {
      this.emit(HCCrawler.Events.Disconnected);
    });
  }

  /**
   * @return {!Promise}
   */
  init() {
    return this._cache.init()
      .then(() => {
        this._queue.init();
      });
  }

  /**
   * @param {Object|Array|string} options
   */
  queue(options) {
    each(isArray(options) ? options : [options], _options => {
      const queueOptions = isString(_options) ? { url: _options } : _options;
      each(CONSTRUCTOR_OPTIONS, option => {
        if (queueOptions[option]) throw new Error(`Overriding ${option} is not allowed!`);
      });
      const mergedOptions = extend({}, this._options, queueOptions);
      if (mergedOptions.evaluatePage) mergedOptions.evaluatePage = `(${mergedOptions.evaluatePage})()`;
      if (!mergedOptions.url) throw new Error('Url must be defined!');
      if (mergedOptions.device && !includes(deviceNames, mergedOptions.device)) throw new Error('Specified device is not supported!');
      if (mergedOptions.delay > 0 && mergedOptions.maxConcurrency !== 1) throw new Error('Max concurrency must be 1 when delay is set!');
      this._queue.push(omit(mergedOptions, CONSTRUCTOR_OPTIONS), mergedOptions.priority);
    });
  }

  /**
   * @return {!Promise}
   */
  close() {
    this._queue.end();
    return Promise.all([
      this._browser.close(),
      this._endExporter(),
      this._clearCacheOnEnd().then(() => this._closeCache()),
    ]);
  }

  /**
   * @return {!Promise}
   */
  disconnect() {
    this._queue.end();
    return Promise.all([
      this._browser.disconnect(),
      this._endExporter(),
      this._clearCacheOnEnd().then(() => this._closeCache()),
    ]);
  }

  /**
   * @return {!Promise<!string>}
   */
  version() {
    return this._browser.version();
  }

  /**
   * @return {!Promise<!string>}
   */
  userAgent() {
    return this._browser.userAgent();
  }

  /**
   * @return {!Promise<!string>}
   */
  wsEndpoint() {
    return this._browser.wsEndpoint();
  }

  /**
   * @return {!Promise}
   */
  onIdle() {
    return this._queue.onIdle();
  }

  /**
   * @param {!number} maxRequest
   */
  setMaxRequest(maxRequest) {
    this._options.maxRequest = maxRequest;
  }

  pause() {
    this._queue.pause();
  }

  resume() {
    this._queue.resume();
  }

  /**
   * @return {!Promise}
   */
  clearCache() {
    return this._cache.clear();
  }

  /**
   * @return {!boolean}
   */
  isPaused() {
    return this._queue.isPaused();
  }

  /**
   * @return {!Promise<!number>}
   */
  queueSize() {
    return this._queue.size();
  }

  /**
   * @return {!number}
   */
  pendingQueueSize() {
    return this._queue.pending();
  }

  /**
   * @return {!number}
   */
  requestedCount() {
    return this._requestedCount;
  }

  /**
   * @param {!Object} options
   * @param {!number=} depth
   * @return {!Promise}
   * @private
   */
  _onPull(options, depth = 1) {
    return Promise.all([
      this._checkExists(options),
      this._checkAllowedRobots(options),
      this._checkAllowedDomains(options),
      this._shouldRequest(options),
    ])
      .then(([exists, allowedRobot, allowedDomain, shouldRequest]) => {
        if (exists || !allowedRobot || !allowedDomain || !shouldRequest) {
          this.emit(HCCrawler.Events.RequestSkipped, options);
          return Promise.resolve();
        }
        return this._request(options, depth);
      });
  }

  /**
   * @param {!Object} options
   * @param {!number} depth
   * @param {!number=} retryCount
   * @return {!Promise}
   * @private
   */
  _request(options, depth, retryCount = 0) {
    this.emit(HCCrawler.Events.RequestStarted, options);
    return this._newPage(options)
      .then(crawler => (
        crawler.crawl()
          .then(res => {
            res = extend({}, res);
            res.response = reduce(RESPONSE_FIELDS, (memo, field) => {
              memo[field] = res.response[field]();
              return memo;
            }, {});
            res.options = options;
            res.depth = depth;
            this.emit(HCCrawler.Events.RequestFinished, res);
            return this._success(res)
              .then(() => {
                this._exportLine(res);
                this._followLinks(res.links, options, depth);
                this._checkRequestCount();
              })
              .then(() => crawler.close())
              .then(() => delay(options.delay));
          })
          .catch(error => {
            if (retryCount >= options.retryCount) throw error;
            this.emit(HCCrawler.Events.RequestRetried, options);
            return this._removeExists(options)
              .then(() => crawler.close())
              .then(() => delay(options.retryDelay))
              .then(() => this._request(options, depth, retryCount + 1));
          })
          .catch(error => {
            this.emit(HCCrawler.Events.RequestFailed, error);
            return this._error(error)
              .then(() => void this._checkRequestCount())
              .then(() => crawler.close())
              .then(() => delay(options.delay));
          })
      ));
  }

  /**
   * @param {!Object} options
   * @return {!Promise<!boolean>}
   * @private
   */
  _checkAllowedRobots(options) {
    if (!options.obeyRobotsTxt) return Promise.resolve(true);
    const robotsUrl = getRobotsUrl(options.url);
    return Promise.all([
      this._getRobotsTxt(robotsUrl),
      this._getUserAgent(options),
    ])
      .then(([robotsTxt, userAgent]) => {
        const robot = robotsParser(robotsUrl, robotsTxt);
        return robot.isAllowed(options.url, userAgent);
      });
  }

  /**
   * @param {!string} url
   * @return {!Promise<?string>}
   * @private
   */
  _getRobotsTxt(url) {
    return this._cache.get(url)
      .then(cachedTxt => {
        if (isString(cachedTxt)) return cachedTxt;
        return request(url)
          .then(txt => (
            this._cache.set(url, txt)
              .then(() => txt)
          ))
          .catch(error => {
            this.emit(HCCrawler.Events.RobotsTxtRequestFailed, error);
            return this._cache.set(url, EMPTY_TXT)
              .then(() => EMPTY_TXT);
          });
      });
  }

  /**
   * @param {!Object} options
   * @return {!Promise<!string>}
   * @private
   */
  _getUserAgent(options) {
    return this.userAgent()
      .then(userAgent => (
        options.userAgent ||
        (devices[options.device] && devices[options.device].userAgent) ||
        userAgent
      ));
  }

  /**
   * @param {!Object} options
   * @return {!boolean}
   * @private
   */
  _checkAllowedDomains(options) {
    const { hostname } = parse(options.url);
    if (!options.allowedDomains) return true;
    return some(options.allowedDomains, domain => endsWith(hostname, domain));
  }

  /**
   * @param {!Object} options
   * @return {!Promise<!boolean>}
   * @private
   */
  _checkExists(options) {
    if (!options.skipDuplicates) return Promise.resolve(false);
    const key = generateKey(options);
    return this._cache.get(key)
      .then(value => this._cache.set(key, '1').then(() => !!value));
  }

  /**
   * @param {!Object} options
   * @return {!Promise}
   * @private
   */
  _removeExists(options) {
    if (!options.skipDuplicates) return Promise.resolve(false);
    const key = generateKey(options);
    return this._cache.remove(key);
  }

  /**
   * @param {!Object} options
   * @return {!Promise<?boolean>}
   * @private
   */
  _shouldRequest(options) {
    if (!this._preRequest) return Promise.resolve(true);
    return Promise.resolve(this._preRequest(options));
  }

  /**
   * @param {!Object} result
   * @return {!Promise}
   * @private
   */
  _success(result) {
    if (!this._onSuccess) return Promise.resolve();
    return Promise.resolve(this._onSuccess(result));
  }

  /**
   * @param {!Error} error
   * @return {!Promise}
   * @private
   */
  _error(error) {
    if (!this._onError) return Promise.resolve();
    return Promise.resolve(this._onError(error));
  }

  /**
   * @param {!Object} options
   * @return {!Promise}
   * @private
   */
  _newPage(options) {
    return this._browser.newPage()
      .then(page => new Crawler(page, options));
  }

  /**
   * @param {!Array<!string>} links
   * @param {!Object} options
   * @param {!number} depth
   * @private
   */
  _followLinks(links, options, depth) {
    if (depth >= options.maxDepth) {
      this.emit(HCCrawler.Events.MaxDepthReached);
      return;
    }
    each(links, link => {
      const _options = extend({}, options, { url: link });
      this._queue.push(_options, depth + 1, _options.priority);
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
    if (!this._exporter) return;
    this._exporter.writeHeader();
  }

  /**
   * @param {!Object} res
   * @private
   */
  _exportLine(res) {
    if (!this._exporter) return;
    this._exporter.writeLine(res);
  }

  /**
   * @return {!Promise}
   * @private
   */
  _endExporter() {
    if (!this._exporter) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this._exporter.onEnd()
        .then(resolve)
        .catch(reject);
      this._exporter.writeFooter();
      this._exporter.end();
    });
  }

  /**
   * @return {!Promise}
   * @private
   */
  _clearCacheOnEnd() {
    if (!this._options.persistCache) return this.clearCache();
    return Promise.resolve();
  }

  /**
   * @return {!Promise}
   * @private
   */
  _closeCache() {
    return this._cache.close();
  }
}

HCCrawler.Events = {
  RequestStarted: 'requeststarted',
  RequestSkipped: 'requestskipped',
  RequestFinished: 'requestfinished',
  RequestRetried: 'requestretried',
  RequestFailed: 'requestfailed',
  RobotsTxtRequestFailed: 'robotstxtrequestfailed',
  MaxDepthReached: 'maxdepthreached',
  MaxRequestReached: 'maxrequestreached',
  Disconnected: 'disconnected',
};

tracePublicAPI(HCCrawler);

module.exports = HCCrawler;
