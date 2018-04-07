const assert = require('assert');
const sinon = require('sinon');
const extend = require('lodash/extend');
const HCCrawler = require('../../');
const RedisCache = require('../../cache/redis');
const Server = require('../server');

const PORT = 8080;
const PREFIX = `http://127.0.0.1:${PORT}`;

const DEFAULT_OPTIONS = { args: ['--no-sandbox', '--disable-dev-shm-usage'] };

describe('HCCrawler', function () {
  describe('HCCrawler.launch', function () {
    let crawler;
    let onSuccess;

    beforeEach(function () {
      onSuccess = sinon.spy();
    });

    afterEach(() => crawler.close());

    context('when the server is running', function () {
      let server;

      before(async function () {
        server = await Server.run(PORT);
      });

      after(() => server.stop());

      context('when the crawler is launched with the redis cache', function () {
        context('for the fist time with persistCache = true', function () {
          beforeEach(async function () {
            const cache = new RedisCache();
            crawler = await HCCrawler.launch(extend({
              onSuccess,
              cache,
              persistCache: true,
            }, DEFAULT_OPTIONS));
          });

          it('crawls all queued urls', async function () {
            await crawler.queue(`${PREFIX}/1.html`);
            await crawler.queue(`${PREFIX}/2.html`);
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 2);
          });
        });

        context('for the second time', function () {
          beforeEach(async function () {
            const cache = new RedisCache();
            crawler = await HCCrawler.launch(extend({
              onSuccess,
              cache,
            }, DEFAULT_OPTIONS));
          });

          it('does not crawl already cached urls', async function () {
            await crawler.queue(`${PREFIX}/2.html`);
            await crawler.queue(`${PREFIX}/3.html`);
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
          });
        });
      });
    });
  });
});
