const map = require('lodash/map');
const reduce = require('lodash/reduce');
const pick = require('lodash/pick');
const isEmpty = require('lodash/isEmpty');
const uniq = require('lodash/uniq');
const { devices } = require('puppeteer');
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

const withTimeout = (millis, promise) => {
  const timeout = new Promise((resolve, reject) =>
      setTimeout(
          () => reject(`Timed out after ${millis} ms.`),
          millis));
  return Promise.race([
      promise,
      timeout
  ]);
};

class Crawler {
  /**
   * @param {!Puppeteer.Page} page
   * @param {!Object} options
   * @param {!number} depth
   * @param {string} previousUrl
   */
  constructor(page, options, depth, previousUrl) {
    this._page = page;
    this._options = options;
    this._depth = depth;
    this._previousUrl = previousUrl;
  }

  /**
   * @return {!Promise<!Object>}
   */
  async crawl() {
    await this._prepare();
    const response = await this._request();
    await this._waitFor();
    const [
      result,
      screenshot,
      cookies,
      links,
    ] = await Promise.all([
      this._scrape(),
      this._screenshot(),
      this._getCookies(),
      this._collectLinks(response.url),
    ]);
    return {
      options: this._options,
      depth: this._depth,
      previousUrl: this._previousUrl,
      response: this._reduceResponse(response),
      redirectChain: this._getRedirectChain(response),
      targetId: this._page._target._targetId,
      result,
      screenshot,
      cookies,
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
      this._setCookie(),
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
   * @return {!Promise}
   * @private
   */
  async _setCookie() {
    if (!this._options.cookies || isEmpty(this._options.cookies)) return;
    await this._page.setCookie(...this._options.cookies);
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
    if (!this._options.evaluatePage) return null;
    await this._addJQuery();
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
   * @return {!Promise<!Buffer|!String>}
   * @private
   */
  async _screenshot() {
    if (!this._options.screenshot) return null;
    return this._page.screenshot(this._options.screenshot);
  }

  /**
   * @return {!Promise<!Array<!Object>>}
   * @private
   */
  async _getCookies() {
    return this._page.cookies();
  }

  /**
   * @param {!string} baseUrl
   * @return {!Promise<!Array<!string>>}
   * @private
   */
  async _collectLinks(baseUrl) {
    const links = [];
    await withTimeout(5000, this._page.exposeFunction('pushToLinks', link => {
      const _link = resolveUrl(link, baseUrl);
      if (_link) links.push(_link);
    })).catch(function(e) {
      console.log(e);
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
