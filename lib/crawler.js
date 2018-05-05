const map = require('lodash/map');
const reduce = require('lodash/reduce');
const pick = require('lodash/pick');
const isEmpty = require('lodash/isEmpty');
const uniq = require('lodash/uniq');
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
const REQUEST_FIELDS = [
  'url',
  'headers',
];
const RESPONSE_FIELDS = [
  'ok',
  'url',
  'status',
  'headers',
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
   * @return {!Promise}
   */
  async crawl() {
    await this._prepare();
    const response = await this._request();
    await this._waitFor();
    const result = await this._scrape();
    const screenshot = await this._screenshot();
    const links = await this._collectLinks(response.url);
    return {
      response: this._reduceResponse(response),
      redirectChain: this._getRedirectChain(response),
      result,
      screenshot,
      links,
    };
  }

  /**
   * @return {!Promise}
   */
  async close() {
    await this._page.close();
  }

  /**
   * @return {!Puppeteer.Page}
   */
  page() {
    return this._page;
  }

  /**
   * @return {!Promise}
   * @private
   */
  async _prepare() {
    await Promise.all([
      this._preventNewTabs(),
      this._authenticate(),
      this._emulate(),
      this._setViewport(),
      this._setBypassCSP(),
      this._setCacheEnabled(),
      this._setUserAgent(),
      this._setExtraHeaders(),
      this._handlePageEvents(),
    ]);
  }

  /**
   * @return {!Promise}
   * @private
   */
  async _preventNewTabs() {
    await this._page.evaluateOnNewDocument(() => {
      window.open = (url => {
        window.location.href = url;
        return window;
      });
    });
  }

  /**
   * @return {!Promise}
   * @private
   */
  async _authenticate() {
    const credentials = pick(this._options, ['username', 'password']);
    if (!credentials.username && !credentials.password) return;
    await this._page.authenticate(credentials);
  }

  /**
   * @return {!Promise}
   * @private
   */
  async _emulate() {
    if (!this._options.device) return;
    await this._page.emulate(devices[this._options.device]);
  }

  /**
   * @return {!Promise}
   * @private
   */
  async _setViewport() {
    if (!this._options.viewport) return;
    await this._page.setViewport(this._options.viewport);
  }

  /**
   * @return {!Promise}
   * @private
   */
  async _setCacheEnabled() {
    if (this._options.browserCache) return;
    // @ts-ignore
    await this._page.setCacheEnabled(false);
  }

  /**
   * @return {!Promise}
   * @private
   */
  async _setBypassCSP() {
    if (!this._options.jQuery) return;
    // @ts-ignore
    await this._page.setBypassCSP(true);
  }

  /**
   * @return {!Promise}
   * @private
   */
  async _setUserAgent() {
    if (!this._options.userAgent) return;
    await this._page.setUserAgent(this._options.userAgent);
  }

  /**
   * @return {!Promise}
   * @private
   */
  async _setExtraHeaders() {
    if (!this._options.extraHeaders || isEmpty(this._options.extraHeaders)) return;
    await this._page.setExtraHTTPHeaders(this._options.extraHeaders);
  }

  /**
   * @private
   */
  _handlePageEvents() {
    this._page.on('pageerror', text => void debugConsole(text));
    this._page.on('console', msg => void debugConsole(`${msg.type()} ${msg.text()} at ${this._options.url}`));
    this._page.on('dialog', dialog => void this._handleDialog(dialog));
  }

  /**
   * @param {!Puppeteer.Dialog} dialog
   * @return {!Promise}
   * @private
   */
  async _handleDialog(dialog) {
    debugDialog(`${dialog.type()} ${dialog.message()} at ${this._options.url}`);
    await dialog.dismiss();
  }

  /**
   * @return {!Promise}
   * @private
   */
  _request() {
    const gotoOptions = pick(this._options, GOTO_OPTIONS);
    return this._page.goto(this._options.url, gotoOptions);
  }

  /**
   * @return {!Promise}
   * @private
   */
  async _waitFor() {
    if (!this._options.waitFor) return;
    await this._page.waitFor(
      this._options.waitFor.selectorOrFunctionOrTimeout,
      this._options.waitFor.options,
      ...(this._options.waitFor.args || []) // eslint-disable-line comma-dangle
    );
  }

  /**
   * @return {!Promise}
   * @private
   */
  async _scrape() {
    if (!this._options.evaluatePage && !this._options.customScrape) return null;
    await this._addJQuery();
    if(this._options.customScrape) {
      return this._options.customScrape(this._page);
    }

    return this._page.evaluate(this._options.evaluatePage);
  }

  /**
   * @return {!Promise}
   * @private
   */
  async _addJQuery() {
    if (!this._options.jQuery) return;
    await this._page.addScriptTag({ path: jQueryPath });
  }

  /**
   * @return {!Promise}
   * @private
   */
  async _screenshot() {
    if (!this._options.screenshot) return null;
    return this._page.screenshot(this._options.screenshot);
  }

  /**
   * @param {!string} baseUrl
   * @return {!Promise}
   * @private
   */
  async _collectLinks(baseUrl) {
    const links = [];
    await this._page.exposeFunction('pushToLinks', link => {
      const _link = resolveUrl(link, baseUrl);
      if (_link) links.push(_link);
    });
    await this._page.evaluate(() => {
      function findLinks(document) {
        document.querySelectorAll('a[href]')
          .forEach(link => {
            // @ts-ignore
            window.pushToLinks(link.href);
          });
        document.querySelectorAll('iframe,frame')
          .forEach(frame => {
            try {
              findLinks(frame.contentDocument);
            } catch (e) {
              console.warn(e.message);
              // @ts-ignore
              if (frame.src) window.pushToLinks(frame.src);
            }
          });
      }
      findLinks(window.document);
    });
    return uniq(links);
  }

  /**
   * @param {!Puppeteer.Request} request
   * @return {!Object}
   * @private
   */
  _reduceRequest(request) {
    return reduce(REQUEST_FIELDS, (memo, field) => {
      memo[field] = request[field]();
      return memo;
    }, {});
  }

  /**
   * @param {!Puppeteer.Response} response
   * @return {!Object}
   * @private
   */
  _reduceResponse(response) {
    return reduce(RESPONSE_FIELDS, (memo, field) => {
      memo[field] = response[field]();
      return memo;
    }, {});
  }

  /**
   * @param {!Puppeteer.Response} response
   * @return {!Array<!Object>}
   * @private
   */
  _getRedirectChain(response) {
    return map(response.request().redirectChain(), this._reduceRequest);
  }
}

tracePublicAPI(Crawler);

module.exports = Crawler;
