const _ = require('lodash');
const Puppeteer = require('puppeteer');
const Crawler = require('./crawler');

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

class HCCrawler extends Puppeteer {
  /**
   * Connect to an existing Chromium instance.
   * @param {Object} options
   * @return {Promise} resolved after successfully connecting a browser
   * @override
   * @static
   */
  static connect(options) {
    return super.connect(_.pick(options, PUPPETEER_CONNECT_OPTIONS))
      .then(browser => new Crawler(browser, _.omit(options, PUPPETEER_CONNECT_OPTIONS)));
  }

  /**
   * Launch a Chromium instance.
   * @param {Object} options
   * @return {Promise} resolved after successfully launching a browser
   * @override
   * @static
   */
  static launch(options) {
    return super.launch(_.pick(options, PUPPETEER_LAUNCH_OPTIONS))
      .then(browser => new Crawler(browser, _.omit(options, PUPPETEER_LAUNCH_OPTIONS)));
  }
}

module.exports = HCCrawler;
