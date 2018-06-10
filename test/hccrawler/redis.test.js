const extend = require('lodash/extend');
const HCCrawler = require('../../');
const RedisCache = require('../../cache/redis');
const Server = require('../server');

const PORT = 8080;
const PREFIX = `http://127.0.0.1:${PORT}`;

const DEFAULT_OPTIONS = { args: ['--no-sandbox'] };

describe('HCCrawler', () => {
  describe('HCCrawler.launch', () => {
    beforeEach(() => {
      this.onSuccess = jest.fn();
    });

    describe('when the server is running', () => {
      beforeAll(async () => {
        this.server = await Server.run(PORT);
      });

      afterAll(() => this.server.stop());

      describe('when the crawler is launched with the redis cache', () => {
        test('does not crawl already cached urls', async () => {
          this.crawler = await HCCrawler.launch(extend({
            onSuccess: this.onSuccess,
            cache: new RedisCache(),
            persistCache: true,
          }, DEFAULT_OPTIONS));
          await this.crawler.queue(`${PREFIX}/1.html`);
          await this.crawler.queue(`${PREFIX}/2.html`);
          await this.crawler.onIdle();
          await this.crawler.close();
          expect(this.onSuccess).toHaveBeenCalledTimes(2);
          this.crawler = await HCCrawler.launch(extend({
            onSuccess: this.onSuccess,
            cache: new RedisCache(),
          }, DEFAULT_OPTIONS));
          await this.crawler.queue(`${PREFIX}/2.html`);
          await this.crawler.queue(`${PREFIX}/3.html`);
          await this.crawler.onIdle();
          await this.crawler.close();
          expect(this.onSuccess).toHaveBeenCalledTimes(3);
        });
      });
    });
  });
});
