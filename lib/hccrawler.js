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
  static connect(options) {
    return super.connect(_.pick(options, PUPPETEER_CONNECT_OPTIONS))
      .then(browser => new Crawler(browser, _.omit(options, PUPPETEER_CONNECT_OPTIONS)));
  }

  static launch(options) {
    return super.launch(_.pick(options, PUPPETEER_LAUNCH_OPTIONS))
      .then(browser => new Crawler(browser, _.omit(options, PUPPETEER_LAUNCH_OPTIONS)));
  }
}

module.exports = HCCrawler;
