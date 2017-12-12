const _ = require('lodash');
const devices = require('puppeteer/DeviceDescriptors');
const { debugRequest, debugBrowser } = require('./helper');

const PAGE_GOTO_OPTIONS = [
  'timeout',
  'waitUntil',
];
const RESPONSE_FIELDS = [
  'ok',
  'url',
  'status',
  'headers',
];

const jQueryPath = require.resolve('jquery');

class Crawler {
  constructor(page, options) {
    this._page = page;
    this._options = options;
  }

  /**
   * @return {Promise} resolved when crawling successfully ends
   */
  crawl() {
    return this._prepare()
      .then(() => this._page.goto(this._options.url, _.pick(this._options, PAGE_GOTO_OPTIONS)))
      .then(_response => {
        const response = _.pick(_response, RESPONSE_FIELDS);
        return this._captureScreenshot()
          .then(() => this._addJQuery())
          .then(() => this._page.evaluate(this._options.evaluatePage))
          .then(result => this._options.onSuccess({ response, result, options: this._options }))
          .then(() => void debugRequest(`End requesting ${this._options.url}`))
          .then(() => this._page.close())
          .then(() => void debugRequest(`Closed page for ${this._options.url}`));
      });
  }

  /**
   * @return {Promise} preparation completed
   * @private
   */
  _prepare() {
    return Promise.all([
      this._handlePageEvents(),
      this._authenticate(),
      this._emulate(),
      this._setUserAgent(),
      this._setExtraHeaders(),
    ]);
  }

  /**
   * @return {Promise} resolved after authentication
   * @private
   */
  _authenticate() {
    const credentials = _.pick(this._options, ['username', 'password']);
    if (!credentials.username && !credentials.password) return Promise.resolve();
    return this._page.authenticate(credentials);
  }

  /**
   * @return {Promise} resolved after emulating devices
   * @private
   */
  _emulate() {
    if (!this._options.device) return Promise.resolve();
    return this._page.emulate(devices[this._options.device]);
  }

  /**
   * @return {Promise} resolved after setting user agent
   * @private
   */
  _setUserAgent() {
    if (!this._options.userAgent) return Promise.resolve();
    return this._page.setUserAgent(this._options.userAgent);
  }

  /**
   * @return {Promise} resolved after setting extra headers
   * @private
   */
  _setExtraHeaders() {
    if (!this._options.extraHeaders || _.isEmpty(this._options.extraHeaders)) {
      return Promise.resolve();
    }
    return this._page.setExtraHTTPHeaders(this._options.extraHeaders);
  }

  /**
   * @return {Promise} resolved after screenshot is captured
   * @private
   */
  _captureScreenshot() {
    if (!this._options.jQuery) return Promise.resolve();
    return this._page.addScriptTag({ path: jQueryPath });
  }

  /**
   * @return {Promise} resolved after adding jQuery
   * @private
   */
  _addJQuery() {
    if (!this._options.jQuery) return Promise.resolve();
    return this._page.addScriptTag({ path: jQueryPath });
  }

  /**
   * @private
   */
  _handlePageEvents() {
    this._page.on('load', () => void debugRequest(`Page loaded for ${this._options.url}`));
    this._page.on('pageerror', msg => void debugRequest(msg));
    this._page.on('console', msg => void debugBrowser(`Console ${msg.type} ${msg.text} for ${this._options.url}`));
    this._page.on('dialog', dialog => this._handleDialog(dialog, this._options));
  }

  /**
   * @param {Puppeteer.Dialog} dialog
   * @return {Promise} resolved after dialog is dismissed
   * @private
   */
  _handleDialog(dialog) {
    debugBrowser(`Dialog ${dialog.type} ${dialog.message()} for ${this._options.url}`);
    return dialog.dismiss();
  }
}

module.exports = Crawler;
