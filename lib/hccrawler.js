const Puppeteer = require('puppeteer');
const HCBrowser = require('./hcbrowser');

class HCCrawler extends Puppeteer {
  static connect(options) {
    return super.connect(options)
      .then(browser => new HCBrowser(browser, options));
  }

  static launch(options) {
    return super.launch(options)
      .then(browser => new HCBrowser(browser, options));
  }
}

module.exports = HCCrawler;
