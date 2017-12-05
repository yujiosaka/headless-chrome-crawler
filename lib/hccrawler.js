const Puppeteer = require('puppeteer');
const Crawler = require('./crawler');

class HCCrawler extends Puppeteer {
  static connect(options) {
    return super.connect(options)
      .then(browser => new Crawler(browser, options));
  }

  static launch(options) {
    return super.launch(options)
      .then(browser => new Crawler(browser, options));
  }
}

module.exports = HCCrawler;
