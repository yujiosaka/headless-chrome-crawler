const { existsSync } = require('fs');
const extend = require('lodash/extend');
const HCCrawler = require('../..');

const INDEX_PAGE = 'https://bot.sannysoft.com';
const PNG_FILE = './tmp/bot.png';
const TEST_TIMEOUT = 10000;

const DEFAULT_OPTIONS = { args: ['--no-sandbox'] };

jest.useRealTimers();
jest.setTimeout(TEST_TIMEOUT);
describe('HCCrawler', () => {
  describe('HCCrawler.executablePath', () => {
    test('returns the existing path', () => {
      const executablePath = HCCrawler.executablePath();
      expect(existsSync(executablePath)).toBe(true);
    });
  });

  describe('HCCrawler.defaultArgs', () => {
    test('returns the default chrome arguments', () => {
      const args = HCCrawler.defaultArgs();
      expect(args).toContain('--no-first-run');
    });
  });

  describe('HCCrawler.connect', () => {
    beforeEach(async () => {
      this.crawler = await HCCrawler.launch(DEFAULT_OPTIONS);
    });

    afterEach(() => this.crawler.close());

    test('connects multiple times to the same crawler', async () => {
      const secondCrawler = await HCCrawler.connect({
        browserWSEndpoint: this.crawler.wsEndpoint(),
      });
      await secondCrawler.close();
    });

    test('reconnects to an already disconnected crawler', async () => {
      const browserWSEndpoint = this.crawler.wsEndpoint();
      await this.crawler.disconnect();
      this.crawler = await HCCrawler.connect({ browserWSEndpoint });
    });
  });

  describe('HCCrawler.launch', () => {
    beforeEach(() => {
      this.onSuccess = jest.fn();
      this.onError = jest.fn();
    });

    afterEach(() => this.crawler.close());

    test('launches a crawler', async () => {
      this.crawler = await HCCrawler.launch(DEFAULT_OPTIONS);
    });

    describe('when INDEX_PAGE is reachable', () => {
      function evaluatePage() {
        return $('body').text();
      }

      test('emits a disconnect event', async () => {
        this.crawler = await HCCrawler.launch(extend({
          evaluatePage,
          onSuccess: this.onSuccess,
        }, DEFAULT_OPTIONS));
        let disconnected = 0;
        this.crawler.on('disconnected', () => { disconnected += 1; });
        await this.crawler.close();
        expect(disconnected).toBe(1);
      });

      describe('when the crawler is launched with the preRequest function', () => {
        describe('when the preRequest function returns true', () => {
          function preRequest() {
            return true;
          }

          beforeEach(async () => {
            this.crawler = await HCCrawler.launch(extend({
              onSuccess: this.onSuccess,
              preRequest,
            }, DEFAULT_OPTIONS));
          });

          test('does not skip crawling', async () => {
            let requestskipped = 0;
            this.crawler.on('requestskipped', () => { requestskipped += 1; });
            await this.crawler.queue(INDEX_PAGE);
            await this.crawler.onIdle();
            expect(requestskipped).toBe(0);
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
          });
        });

        describe('when the preRequest function returns false', () => {
          function preRequest() {
            return false;
          }

          beforeEach(async () => {
            this.crawler = await HCCrawler.launch(extend({
              onSuccess: this.onSuccess,
              preRequest,
            }, DEFAULT_OPTIONS));
          });

          test('skips crawling', async () => {
            let requestskipped = 0;
            this.crawler.on('requestskipped', () => { requestskipped += 1; });
            await this.crawler.queue(INDEX_PAGE);
            await this.crawler.onIdle();
            expect(requestskipped).toBe(1);
            expect(this.onSuccess).toHaveBeenCalledTimes(0);
          });
        });

        describe('when the preRequest function modifies options', () => {
          function preRequest(options) {
            options.screenshot = { path: PNG_FILE, fullPage: true };
            return true;
          }

          beforeEach(async () => {
            this.crawler = await HCCrawler.launch(extend({
              onSuccess: this.onSuccess,
              preRequest,
            }, DEFAULT_OPTIONS));
          });

          test('modifies options', async () => {
            await this.crawler.queue(INDEX_PAGE);
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
            expect(this.onSuccess.mock.calls[0][0].options.screenshot.path).toBe(PNG_FILE);
          });
        });
      });
    });
  });
});
