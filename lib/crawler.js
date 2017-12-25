const {
  pick,
  isEmpty,
  uniq,
  noop,
} = require('lodash');
const devices = require('puppeteer/DeviceDescriptors');
const {
  resolveUrl,
  debugConsole,
  debugDialog,
  tracePublicAPI,
} = require('./helper');

const GOTO_OPTIONS = [
  'timeout',
  'waitUntil',
];

const jQueryPath = require.resolve('jquery');

class Crawler {
  /**
   * @param {!Puppeteer.Page} page
   * @param {!Object} options
   */
  constructor(page, options) {
    this._page = page;
    this._options = options;
  }

  /**
   * @return {Promise}
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
   * @return {Promise}
   */
  close() {
    return this._page.close();
  }

  /**
   * @return {Promise}
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
   * @return {Promise}
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
   * @return {Promise}
   * @private
   */
  _authenticate() {
    const credentials = pick(this._options, ['username', 'password']);
    if (!credentials.username && !credentials.password) return Promise.resolve();
    return this._page.authenticate(credentials);
  }

  /**
   * @return {Promise}
   * @private
   */
  _emulate() {
    if (!this._options.device) return Promise.resolve();
    return this._page.emulate(devices[this._options.device]);
  }

  /**
   * @return {Promise}
   * @private
   */
  _setUserAgent() {
    if (!this._options.userAgent) return Promise.resolve();
    return this._page.setUserAgent(this._options.userAgent);
  }

  /**
   * @return {Promise}
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
    this._page.on('pageerror', msg => void debugConsole(msg));
    this._page.on('console', msg => void debugConsole(`${msg.type} ${msg.text} at ${this._options.url}`));
    this._page.on('dialog', dialog => this._handleDialog(dialog, this._options));
  }

  /**
   * @param {Puppeteer.Dialog} dialog
   * @return {Promise}
   * @private
   */
  _handleDialog(dialog) {
    debugDialog(`${dialog.type} ${dialog.message()} at ${this._options.url}`);
    return dialog.dismiss();
  }

  /**
   * @return {Promise}
   * @private
   */
  _request() {
    const gotoOptions = pick(this._options, GOTO_OPTIONS);
    return this._page.goto(this._options.url, gotoOptions);
  }

  /**
   * @return {Promise}
   * @private
   */
  _scrape() {
    const evaluatePage = this._options.evaluatePage || noop;
    return this._addJQuery()
      .then(() => this._page.evaluate(evaluatePage));
  }

  /**
   * @return {Promise}
   * @private
   */
  _addJQuery() {
    if (!this._options.jQuery) return Promise.resolve();
    return this._page.addScriptTag({ path: jQueryPath });
  }

  /**
   * @return {Promise}
   * @private
   */
  _screenshot() {
    if (!this._options.screenshot) return Promise.resolve(null);
    return this._page.screenshot(this._options.screenshot);
  }

  /**
   * @param {!string} baseUrl
   * @return {Promise}
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

tracePublicAPI(Crawler);

module.exports = Crawler;
