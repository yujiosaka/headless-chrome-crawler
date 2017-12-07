const _ = require('lodash');
const PQueue = require('p-queue');
const devices = require('puppeteer/DeviceDescriptors');
const debugBrowser = require('debug')('hccrawler:browser');
const debugRequest = require('debug')('hccrawler:request');
const { delay } = require('./helper');

const PUPPETEER_GOTO_OPTIONS = [
  'timeout',
  'waitUntil',
];

const deviceNames = Object.keys(devices);
const jQueryPath = require.resolve('jQuery');

class Browser {

  /**
   * @param {Puppeteer.Browser} browser
   * @param {Object} options
   */
  constructor(browser, options) {
    this.browser = browser;
    this.options = _.extend({
      concurrency: 10,
      priority: 1,
      delay: 0,
      retryCount: 3,
      retryDelay: 10000,
      jQuery: true,
    }, options);
    this._pQueue = new PQueue({
      concurrency: this.options.concurrency,
    });
  }

  /**
   * @param {Object|Array|string} options
   */
  queue(options) {
    _.each(_.isArray(options) ? options : [options], _options => {
      let mergedOptions = _.isString(_options) ? { url: _options } : _options;
      mergedOptions = _.extend({}, this.options, mergedOptions);
      this._validateOptions(mergedOptions);
      this._pQueue.add(() => this._request(mergedOptions), {
        priority: mergedOptions.priority,
      });
    });
  }

  /**
   * @return {Promise} resolved when ther browser is closed
   */
  close() {
    return this.browser.close();
  }

  /**
   * @return {Promise} resolved when queue is empty
   */
  onIdle() {
    return this._pQueue.onIdle();
  }

  /**
   * @return {number} queue size
   * @readonly
   */
  get queueSize() {
    return this._pQueue.size + 1;
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
    if (options.delay > 0 && options.concurrency !== 1) throw new Error('Concurrency must be 1 when delay is set!');
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
        return this.browser.newPage()
          .then(page => {
            page.on('console', (msg => void debugBrowser(msg.text)));
            return this._authenticate(page, options)
              .then(() => this._emulate(page, options))
              .then(() => this._setExtraHeaders(page, options))
              .then(() => page.goto(options.url, _.pick(options, PUPPETEER_GOTO_OPTIONS)))
              .then(res => {
                debugRequest(`Opened page for ${options.url}`);
                return this._addJQuery(page, options)
                  .then(() => page.evaluate(options.evaluatePage))
                  .then(result => options.onSuccess({ status: res.status, options, result }))
                  .then(() => void debugRequest(`End requesting ${options.url}`))
                  .then(() => page.close())
                  .then(() => void debugRequest(`Closed page for ${options.url}`))
                  .then(() => delay(options.delay));
              });
          });
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
    return options.preRequest
      ? Promise.resolve(options.preRequest(options))
      : Promise.resolve(true);
  }

  /**
   * @param {Puppeteer.Page} page
   * @param {Object} options
   * @return {Promise} resolved after authentication
   * @private
   */
  _authenticate(page, options) {
    const credentials = _.pick(options, ['username', 'password']);
    return (credentials.username || credentials.password)
      ? page.authenticate(credentials)
      : Promise.resolve();
  }

  /**
   * @param {Puppeteer.Page} page
   * @param {Object} options
   * @return {Promise} resolved after emulating devices
   * @private
   */
  _emulate(page, options) {
    return options.device
      ? page.emulate(devices[options.device])
      : Promise.resolve();
  }

  /**
   * @param {Puppeteer.Page} page
   * @param {Object} options
   * @return {Promise} resolved after setting extra headers
   * @private
   */
  _setExtraHeaders(page, options) {
    return options.extraHeaders && !_.isEmpty(options.extraHeaders)
      ? page.setExtraHTTPHeaders(options.extraHeaders)
      : Promise.resolve();
  }

  /**
   * @param {Puppeteer.Page} page
   * @param {Object} options
   * @return {Promise} resolved after adding jQuery
   * @private
   */
  _addJQuery(page, options) {
    return options.jQuery
      ? page.addScriptTag({ path: jQueryPath })
      : Promise.resolve();
  }
}

module.exports = Browser;
