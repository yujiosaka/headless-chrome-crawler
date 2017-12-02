const _ = require('lodash');
const PQueue = require('p-queue');
const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const { delay } = require('./helper');

const deviceNames = Object.keys(devices);
const jQueryPath = require.resolve('jQuery');

class HCCrawler {
  constructor(options) {
    this.options = _.extend({
      concurrency: 10,
      priority: 1,
      delay: 0,
      retryCount: 3,
      retryDelay: 10000,
      jQuery: true,
      captureConsole: false,
    }, options);
    this._pQueue = new PQueue({
      concurrency: this.options.concurrency,
    });
  }

  launch(options) {
    return puppeteer.launch(options)
      .then(browser => {
        this.browser = browser;
      });
  }

  queue(options) {
    if (!this.browser) throw new Error('Browser is not launched yet!');
    _.each(_.isArray(options) ? options : [options], _options => {
      let mergedOptions = _.isString(_options) ? { url: _options } : _options;
      mergedOptions = _.extend({}, this.options, mergedOptions);
      this._validateOptions(mergedOptions);
      this._pQueue.add(() => this._request(mergedOptions), {
        priority: mergedOptions.priority,
      });
    });
  }

  _validateOptions(options) {
    if (!options.url) throw new Error('Url must be defined!');
    if (!options.evaluatePage) throw new Error('Evaluate page function must be defined!');
    if (!options.onSuccess) throw new Error('On success function must be defined!');
    if (options.device && !_.includes(deviceNames, options.device)) throw new Error('Specified device is not supported!');
    if (options.delay > 0 && options.concurrency !== 1) throw new Error('Concurrency must be 1 when delay is set!');
  }

  _request(options, retryCount = 0) {
    return Promise.resolve(options.shouldRequest ? options.shouldRequest(options) : true)
      .then(shouldRequest => {
        if (!shouldRequest) return Promise.resolve();
        return this.browser.newPage()
          .then(page => {
            const credentials = _.pick(options, ['username', 'password']);
            if (options.username || options.password) page.authenticate(credentials);
            if (options.captureConsole) page.on('console', this._captureConsole);
            return (options.device ? page.emulate(devices[options.device]) : Promise.resolve())
              .then(() => page.goto(options.url, _.pick(options, ['timeout', 'waitUntil'])))
              .then(res => (
                (options.jQuery ? page.addScriptTag({ path: jQueryPath }) : Promise.resolve())
                  .then(() => page.evaluate(options.evaluatePage))
                  .then(result => options.onSuccess({ status: res.status, options, result }))
                  .then(() => page.close())
                  .then(() => delay(options.delay))
              ));
          });
      })
      .catch(err => {
        if (retryCount >= options.retryCount) throw new Error(`Retried too many times while requesting ${options.url}!`, err);
        return delay(options.retryDelay).then(() => this._request(options, retryCount + 1));
      })
      .catch(options.onError || _.noop);
  }

  _captureConsole(msg) {
    console[msg.type](`[browser] ${msg.text}`);
  }

  close() {
    return this.browser.close();
  }

  onIdle() {
    return this._pQueue.onIdle();
  }

  get queueSize() {
    return this._pQueue.size + 1;
  }
}

module.exports = HCCrawler;
