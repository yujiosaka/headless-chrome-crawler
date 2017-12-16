const { pick, isEmpty, uniq } = require('lodash');
const devices = require('puppeteer/DeviceDescriptors');
const { resolveUrl, debugRequest, debugBrowser } = require('./helper');

const GOTO_OPTIONS = [
  'timeout',
  'waitUntil',
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
      .then(() => this._request())
      .then(response => (
        Promise.all([
          this._scrape(),
          this._screenshot(),
          this._collectLinks(response.url),
        ])
          .then(([result, screenshot, links]) => ({
            response,
            result,
            screenshot,
            links,
          }))
      ));
  }

  /**
   * @return {Promise} resolved when crawler is closed
   */
  close() {
    return this._page.close();
  }

  /**
   * @return {Promise} preparation completed
   * @private
   */
  _prepare() {
    return Promise.all([
      this._preventNewTabs(),
      this._authenticate(),
      this._emulate(),
      this._setUserAgent(),
      this._setExtraHeaders(),
      this._handlePageEvents(),
    ]);
  }

  /**
   * @return {Promise} resolved after preventing new tabs
   * @private
   */
  _preventNewTabs() {
    return this._page.evaluateOnNewDocument(() => {
      window.open = (url => {
        window.location.href = url;
      });
    });
  }

  /**
   * @return {Promise} resolved after authentication
   * @private
   */
  _authenticate() {
    const credentials = pick(this._options, ['username', 'password']);
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
    if (!this._options.extraHeaders || isEmpty(this._options.extraHeaders)) {
      return Promise.resolve();
    }
    return this._page.setExtraHTTPHeaders(this._options.extraHeaders);
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

  _request() {
    const gotoOptions = pick(this._options, GOTO_OPTIONS);
    return this._page.goto(this._options.url, gotoOptions);
  }

  _scrape() {
    return this._addJQuery()
      .then(() => this._page.evaluate(this._options.evaluatePage));
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
   * @return {Promise} resolved after screenshot is captured
   * @private
   */
  _screenshot() {
    if (!this._options.screenshot) return Promise.resolve(null);
    return this._page.screenshot(this._options.screenshot);
  }

  /**
   * @return {Promise} resolved after collecting links
   * @private
   */
  _collectLinks(baseUrl) {
    const links = [];
    return this._page.exposeFunction('pushToLinks', link => {
      const _link = resolveUrl(link, baseUrl);
      if (_link) links.push(_link);
    })
      .then(() => (
        this._page.evaluate(() => {
          function findLinks(document) {
            document.querySelectorAll('a[href]')
              .forEach(link => {
                window.pushToLinks(link.href);
              });
            document.querySelectorAll('iframe,frame')
              .forEach(frame => {
                try {
                  findLinks(frame.contentDocument);
                } catch (e) {
                  console.warn(e.message);
                  if (frame.src) window.pushToLinks(frame.src);
                }
              });
          }
          findLinks(window.document);
        })
      ))
      .then(() => uniq(links));
  }
}

module.exports = Crawler;
