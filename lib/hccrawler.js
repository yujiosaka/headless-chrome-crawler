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
const request = require('request-promise');
const PQueue = require('p-queue');
const robotsParser = require('robots-parser');
const Puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const {
  delay,
  generateKey,
  getRobotsUrl,
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
  'exporter',
  'persistCache',
];
const RESPONSE_FIELDS = [
  'ok',
  'url',
  'status',
  'headers',
];
const ROBOTS_TXT_ERROR = 'error';

const deviceNames = Object.keys(devices);

class HCCrawler extends EventEmitter {
  /**
   * @param {!Object=} options
   * @return {!Promise}
   */
  static connect(options) {
    return Puppeteer.connect(pick(options, PUPPETEER_CONNECT_OPTIONS))
      .then(browser => new HCCrawler(browser, omit(options, PUPPETEER_CONNECT_OPTIONS)))
      .then(crawler => crawler.init().then(() => crawler));
  }

  /**
   * @param {!Object=} options
   * @return {!Promise}
   */
  static launch(options) {
    return Puppeteer.launch(pick(options, PUPPETEER_LAUNCH_OPTIONS))
      .then(browser => new HCCrawler(browser, omit(options, PUPPETEER_LAUNCH_OPTIONS)))
      .then(crawler => crawler.init().then(() => crawler));
  }

  /**
   * @return {!string}
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
      persistCache: false,
      skipDuplicates: true,
      obeyRobotsTxt: true,
      screenshot: null,
    }, options);
    this._cache = options.cache || new SessionCache();
    this._exporter = options.exporter || null;
    this._pQueue = new PQueue({ concurrency: this._options.maxConcurrency });
    this._requestedCount = 0;
    this._exportHeader();
    this._browser.on('disconnected', () => void this.emit(HCCrawler.Events.Disconnected));
  }

  /**
   * @return {!Promise}
   */
  init() {
    return this._cache.init();
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
   * @return {!Promise}
   */
  close() {
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
    return Promise.all([
      this._browser.disconnect(),
      this._endExporter(),
      this._clearCacheOnEnd().then(() => this._closeCache()),
    ]);
  }

  /**
   * @return {!Promise}
   */
  version() {
    return this._browser.version();
  }

  /**
   * @return {!Promise}
   */
  wsEndpoint() {
    return this._browser.wsEndpoint();
  }

  /**
   * @return {!Promise}
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
   * @return {!Promise}
   */
  clearCache() {
    return this._cache.clear();
  }

  /**
   * @return {!bolean}
   */
  isPaused() {
    return this._pQueue.isPaused;
  }

  /**
   * @return {!number}
   */
  queueSize() {
    return this._pQueue.size;
  }

  /**
   * @return {!number}
   */
  pendingQueueSize() {
    return this._pQueue.pending;
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
   * @param {!number=} retryCount
   * @private
   */
  _request(options, depth = 1, retryCount = 0) {
    if (retryCount === 0) this.emit(HCCrawler.Events.RequestStarted, options);
    return Promise.all([
      this._checkExists(options),
      this._checkAllowedRobots(options),
      this._checkAllowedDomains(options),
      this._preRequest(options),
    ])
      .then(([exists, allowedRobot, allowedDomain, shouldRequest]) => {
        if (exists || !allowedRobot || !allowedDomain || !shouldRequest) {
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
   * @return {!Promise<!boolean>}
   * @private
   */
  _checkAllowedRobots(options) {
    if (!options.obeyRobotsTxt) return Promise.resolve(true);
    const robotsUrl = getRobotsUrl(options.url);
    return this._getRobotsTxt(robotsUrl)
      .then(robotsTxt => {
        if (!robotsTxt) return true;
        return this._getUserAgent(options)
          .then(userAgent => {
            const robot = robotsParser(robotsUrl, robotsTxt);
            return robot.isAllowed(options.url, userAgent);
          });
      });
  }

  /**
   * @param {!string} robotsUrl
   * @return {!Promise<?string>}
   * @private
   */
  _getRobotsTxt(url) {
    return this._cache.get(url)
      .then(cachedTxt => {
        if (cachedTxt === ROBOTS_TXT_ERROR) return null;
        if (cachedTxt) return cachedTxt;
        return request(url)
          .then(txt => this._cache.set(url, txt).then(() => txt))
          .catch(error => {
            this.emit(HCCrawler.Events.RobotsTxtRequestFailed, error);
            return this._cache.set(url, ROBOTS_TXT_ERROR).then(() => null);
          });
      });
  }

  /**
   * @param {!Object} options
   * @return {!Promise<!string>}
   * @private
   */
  _getUserAgent(options) {
    return this._browser._connection.send('Browser.getVersion')
      .then(version => (
        options.userAgent ||
        (devices[options.device] && devices[options.device].userAgent) ||
        version.userAgent
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
    if (!this._options.skipDuplicates) return Promise.resolve(false);
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
    if (!this._options.skipDuplicates) return Promise.resolve(false);
    const key = generateKey(options);
    return this._cache.remove(key);
  }

  /**
   * @param {!Object} options
   * @return {!Promise<?boolean>}
   * @private
   */
  _preRequest(options) {
    if (!options.preRequest) return Promise.resolve(true);
    return Promise.resolve(options.preRequest(options));
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
  RequestFailed: 'requestfailed',
  RobotsTxtRequestFailed: 'robotstxtrequestfailed',
  MaxDepthReached: 'maxdepthreached',
  MaxRequestReached: 'maxrequestreached',
  Disconnected: 'disconnected',
};

tracePublicAPI(HCCrawler);

module.exports = HCCrawler;
