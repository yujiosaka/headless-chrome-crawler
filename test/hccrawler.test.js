const { unlink, readFile, existsSync } = require('fs');
const assert = require('assert');
const sinon = require('sinon');
const extend = require('lodash/extend');
const includes = require('lodash/includes');
const noop = require('lodash/noop');
const HCCrawler = require('../');
const RedisCache = require('../cache/redis');
const CSVExporter = require('../exporter/csv');
const JSONLineExporter = require('../exporter/json-line');
const Server = require('./server');

const PORT = 8080;
const PREFIX = `http://127.0.0.1:${PORT}`;
const INDEX_PAGE = `${PREFIX}/`;
const CSV_FILE = './tmp/result.csv';
const JSON_FILE = './tmp/result.json';
const ENCODING = 'utf8';

const DEFAULT_OPTIONS = { args: ['--no-sandbox', '--disable-dev-shm-usage'] };

describe('HCCrawler', () => {
  describe('HCCrawler.executablePath', () => {
    it('returns the existing path', () => {
      const executablePath = HCCrawler.executablePath();
      assert.ok(existsSync(executablePath));
    });
  });

  describe('HCCrawler.defaultArgs', () => {
    it('returns the default chrome arguments', () => {
      const args = HCCrawler.defaultArgs();
      assert.ok(includes(args, '--no-first-run'));
    });
  });

  describe('HCCrawler.connect', () => {
    let crawler;

    beforeEach(async () => {
      crawler = await HCCrawler.launch(DEFAULT_OPTIONS);
    });

    afterEach(() => crawler.close());

    it('connects multiple times to the same crawler', async () => {
      const secondCrawler = await HCCrawler.connect({ browserWSEndpoint: crawler.wsEndpoint() });
      await secondCrawler.close();
    });

    it('reconnects to an already disconnected crawler', async () => {
      const browserWSEndpoint = crawler.wsEndpoint();
      await crawler.disconnect();
      crawler = await HCCrawler.connect({ browserWSEndpoint });
    });
  });

  describe('HCCrawler.launch', () => {
    let crawler;
    let onSuccess;
    let onError;

    beforeEach(() => {
      onSuccess = sinon.spy();
      onError = sinon.spy();
    });

    afterEach(() => crawler.close());

    it('launches a crawler', async () => {
      crawler = await HCCrawler.launch(DEFAULT_OPTIONS);
    });

    context('when the server is running', () => {
      let server;

      function evaluatePage() {
        return $('body').text();
      }

      before(async () => {
        server = await Server.run(PORT);
      });

      after(() => server.stop());

      beforeEach(() => {
        server.reset();
      });

      context('when the crawler is launched with necessary options', () => {
        beforeEach(async () => {
          crawler = await HCCrawler.launch(extend({ onSuccess }, DEFAULT_OPTIONS));
        });

        it('shows the browser version', async () => {
          const version = await crawler.version();
          assert.ok(includes(version, 'HeadlessChrome'));
        });

        it('shows the default user agent', async () => {
          const userAgent = await crawler.userAgent();
          assert.ok(includes(userAgent, 'HeadlessChrome'));
        });

        it('shows the WebSocket endpoint', () => {
          assert.ok(includes(crawler.wsEndpoint(), 'ws://'));
        });

        it('throws an error when queueing null', () => {
          assert.throws(() => {
            crawler.queue(null);
          });
        });

        it('throws an error when queueing options without URL', () => {
          assert.throws(() => {
            crawler.queue();
          });
        });

        it('crawls when queueing necessary options', async () => {
          let requeststarted = 0;
          let requestfinished = 0;
          crawler.on('requeststarted', () => { requeststarted += 1; });
          crawler.on('requestfinished', () => { requestfinished += 1; });
          crawler.queue(INDEX_PAGE);
          await crawler.onIdle();
          assert.equal(requeststarted, 1);
          assert.equal(requestfinished, 1);
          assert.equal(crawler.pendingQueueSize(), 0);
          assert.equal(crawler.requestedCount(), 1);
          assert.equal(onSuccess.callCount, 1);
          assert.equal(onSuccess.firstCall.args[0].options.url, INDEX_PAGE);
          assert.ok(onSuccess.firstCall.args[0].response.ok);
          assert.equal(onSuccess.firstCall.args[0].response.status, 200);
          assert.equal(onSuccess.firstCall.args[0].response.url, INDEX_PAGE);
        });

        it('crawls when queueing a string', async () => {
          crawler.queue(INDEX_PAGE);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
        });

        it('crawls when queueing multiple strings', async () => {
          crawler.queue([`${PREFIX}/1.html`, `${PREFIX}/2.html`, `${PREFIX}/3.html`]);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 3);
        });

        it('crawls when queueing an object', async () => {
          crawler.queue({ url: INDEX_PAGE });
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
        });

        it('crawls when queueing multiple objects', async () => {
          crawler.queue([{ url: `${PREFIX}/1.html` }, { url: `${PREFIX}/2.html` }]);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 2);
        });

        it('crawls when queueing mixed styles', async () => {
          crawler.queue([`${PREFIX}/1.html`, { url: `${PREFIX}/2.html` }]);
          crawler.queue(`${PREFIX}/3.html`);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 3);
        });

        it('throws an error when overriding the onSuccess function', () => {
          assert.throws(() => {
            crawler.queue({ url: INDEX_PAGE, onSuccess: noop });
          });
        });

        it('throws an error when queueing options with an unavailable device', () => {
          assert.throws(() => {
            crawler.queue({ url: INDEX_PAGE, device: 'do-not-exist' });
          });
        });

        it('throws an error when the delay option is set', () => {
          assert.throws(() => {
            crawler.queue({ url: INDEX_PAGE, delay: 100 });
          });
        });

        it('emits a newpage event', async () => {
          let request;
          let response;
          crawler.on('newpage', page => {
            page.on('request', _request => { request = _request; });
            page.on('response', _response => { response = _response; });
          });
          crawler.queue(INDEX_PAGE);
          await crawler.onIdle();
          assert.equal(request.response(), response);
          assert.equal(onSuccess.callCount, 1);
        });

        it('crawls when the requested domain exactly matches allowed domains', async () => {
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          crawler.queue({ url: INDEX_PAGE, allowedDomains: ['127.0.0.1'] });
          await crawler.onIdle();
          assert.equal(requestskipped, 0);
          assert.equal(onSuccess.callCount, 1);
        });

        it('crawls when the requested domain matches allowed domains by the regular expression', async () => {
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          crawler.queue({ url: INDEX_PAGE, allowedDomains: [/\d+\.\d+\.\d+\.\d+/] });
          await crawler.onIdle();
          assert.equal(requestskipped, 0);
          assert.equal(onSuccess.callCount, 1);
        });

        it('skips crawling when the requested domain does not match allowed domains', async () => {
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          crawler.queue({ url: INDEX_PAGE, allowedDomains: ['0.0.0.0'] });
          await crawler.onIdle();
          assert.equal(requestskipped, 1);
          assert.equal(onSuccess.callCount, 0);
        });

        it('skips crawling when the requested domain exactly matches denied domains', async () => {
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          crawler.queue({ url: INDEX_PAGE, deniedDomains: ['127.0.0.1'] });
          await crawler.onIdle();
          assert.equal(requestskipped, 1);
          assert.equal(onSuccess.callCount, 0);
        });

        it('skips crawling when the requested domain matches denied domains by the regular expression', async () => {
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          crawler.queue({ url: INDEX_PAGE, deniedDomains: [/\d+\.\d+\.\d+\.\d+/] });
          await crawler.onIdle();
          assert.equal(requestskipped, 1);
          assert.equal(onSuccess.callCount, 0);
        });

        it('follows links when the maxDepth option is set', async () => {
          let maxdepthreached = 0;
          server.setContent('/1.html', `go to <a href="${PREFIX}/2.html">/2.html</a>`);
          crawler.on('maxdepthreached', () => { maxdepthreached += 1; });
          crawler.queue({ url: `${PREFIX}/1.html`, maxDepth: 2 });
          await crawler.onIdle();
          assert.equal(maxdepthreached, 1);
          assert.equal(onSuccess.callCount, 2);
          assert.deepEqual(onSuccess.firstCall.args[0].links, [`${PREFIX}/2.html`]);
          assert.equal(onSuccess.secondCall.args[0].depth, 2);
        });

        it('crawls regardless of alert dialogs', async () => {
          server.setContent('/', `<script>alert('Welcome to ${INDEX_PAGE}');</script>`);
          crawler.queue(INDEX_PAGE);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
        });

        it('crawls when the path is allowed by the robots.txt', async () => {
          server.setContent('/robots.txt', 'User-agent: *\nAllow: /');
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          crawler.queue(INDEX_PAGE);
          await crawler.onIdle();
          assert.equal(requestskipped, 0);
          assert.equal(onSuccess.callCount, 1);
        });

        it('skips crawling when the path is not allowed by the robots.txt', async () => {
          server.setContent('/robots.txt', 'User-agent: *\nDisallow: /');
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          crawler.queue(INDEX_PAGE);
          await crawler.onIdle();
          assert.equal(requestskipped, 1);
          assert.equal(onSuccess.callCount, 0);
        });

        it('stops crawling when allowed and disallowed paths are mixed', async () => {
          server.setContent('/robots.txt', 'User-agent: *\nDisallow: /2.html');
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          crawler.queue(`${PREFIX}/1.html`);
          crawler.queue(`${PREFIX}/2.html`);
          await crawler.onIdle();
          assert.equal(requestskipped, 1);
          assert.equal(onSuccess.callCount, 1);
        });

        it('does not obey the robots.txt with obeyRobotsTxt = false', async () => {
          server.setContent('/robots.txt', 'User-agent: *\nDisallow: /');
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          crawler.queue({ url: INDEX_PAGE, obeyRobotsTxt: false });
          await crawler.onIdle();
          assert.equal(requestskipped, 0);
          assert.equal(onSuccess.callCount, 1);
        });

        context('when the content rendering is delayed', () => {
          beforeEach(() => {
            server.setContent('/', `
            <script>
            setTimeout(() => {
              window.document.write('<h1>Welcome to ${INDEX_PAGE}</h1>');
            }, 100);
            </script>
            `);
          });

          it('fails evaluating the delayed content without the waitFor option', async () => {
            crawler.queue({
              url: INDEX_PAGE,
              evaluatePage,
            });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
            assert.equal(onSuccess.firstCall.args[0].result, '');
          });

          it('succeeds evaluating the delayed content with the waitFor timeout option', async () => {
            crawler.queue({
              url: INDEX_PAGE,
              waitFor: { selectorOrFunctionOrTimeout: 150 },
              evaluatePage,
            });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
            assert.ok(includes(onSuccess.firstCall.args[0].result, 'Welcome to'));
          });

          it('succeeds evaluating the delayed content with the waitFor selector option', async () => {
            crawler.queue({
              url: INDEX_PAGE,
              waitFor: { selectorOrFunctionOrTimeout: 'h1' },
              evaluatePage,
            });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
            assert.ok(includes(onSuccess.firstCall.args[0].result, 'Welcome to'));
          });

          it('succeeds evaluating the delayed content with the waitFor function', async () => {
            crawler.queue({
              url: INDEX_PAGE,
              waitFor: {
                selectorOrFunctionOrTimeout: (expected => (
                  window.document.body.innerText.includes(expected)
                )),
                args: ['Welcome to'],
              },
              evaluatePage,
            });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
            assert.ok(includes(onSuccess.firstCall.args[0].result, 'Welcome to'));
          });
        });

        context('when the page requires the basic authentication', () => {
          beforeEach(() => {
            server.setContent('/', 'Authorization succeeded!');
            server.setAuth('/', 'username', 'password');
          });

          it('fails authentication when username and password options are not set', async () => {
            crawler.queue({
              url: INDEX_PAGE,
              evaluatePage,
            });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
            assert.equal(onSuccess.firstCall.args[0].result, 'HTTP Error 401 Unauthorized: Access is denied');
          });

          it('fails authentication when wrong username and password options are set', async () => {
            crawler.queue({
              url: INDEX_PAGE,
              username: 'password',
              password: 'username',
              evaluatePage,
            });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
            assert.equal(onSuccess.firstCall.args[0].result, 'HTTP Error 401 Unauthorized: Access is denied');
          });

          it('passes authentication when proper username and password options are set', async () => {
            crawler.queue({
              url: INDEX_PAGE,
              username: 'username',
              password: 'password',
              evaluatePage,
            });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
            assert.equal(onSuccess.firstCall.args[0].result, 'Authorization succeeded!');
          });
        });

        context('when the sitemap.xml is referred by the robots.txt', () => {
          beforeEach(() => {
            server.setContent('/robots.txt', `Sitemap: ${PREFIX}/sitemap.xml`);
            server.setContent('/sitemap.xml', `
            <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <url>
                <loc>${PREFIX}/2.html</loc>
                <priority>1.0</priority>
              </url>
            </urlset>
            `);
          });

          it('does not follow the sitemap.xml', async () => {
            crawler.queue(`${PREFIX}/1.html`);
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
          });

          it('follows the sitemap.xml with followSitemapXml = true', async () => {
            crawler.queue({ url: `${PREFIX}/1.html`, followSitemapXml: true });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 2);
          });
        });
      });

      context('when the crawler is launched with the device option', () => {
        beforeEach(async () => {
          server.setContent('/', '<script>window.document.write(window.navigator.userAgent);</script>');
          crawler = await HCCrawler.launch(extend({
            onSuccess,
            evaluatePage,
            device: 'iPhone 6',
          }, DEFAULT_OPTIONS));
        });

        it('modifies the userAgent', async () => {
          crawler.queue(INDEX_PAGE);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
          assert.ok(includes(onSuccess.firstCall.args[0].result, 'iPhone'));
        });

        it("overrides the device with device = 'Nexus 6'", async () => {
          crawler.queue({ url: INDEX_PAGE, device: 'Nexus 6' });
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
          assert.ok(includes(onSuccess.firstCall.args[0].result, 'Nexus 6'));
        });

        it("overrides the user agent with userAgent = 'headless-chrome-crawler'", async () => {
          crawler.queue({ url: INDEX_PAGE, userAgent: 'headless-chrome-crawler' });
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
          assert.equal(onSuccess.firstCall.args[0].result, 'headless-chrome-crawler');
        });
      });

      context('when the crawler is launched with retryCount = 0', () => {
        beforeEach(async () => {
          crawler = await HCCrawler.launch(extend({
            onSuccess,
            onError,
            retryCount: 0,
          }, DEFAULT_OPTIONS));
        });

        it('succeeds evaluating page', async () => {
          crawler.queue({ url: INDEX_PAGE, evaluatePage });
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
          assert.equal(onSuccess.firstCall.args[0].result, '/');
        });

        it('fails evaluating page with jQuery = false', async () => {
          crawler.queue({ url: INDEX_PAGE, jQuery: false, evaluatePage });
          await crawler.onIdle();
          assert.equal(onError.callCount, 1);
          assert.ok(includes(onError.firstCall.args[0].message, 'Evaluation failed:'));
        });

        context('when the page response is delayed', async () => {
          beforeEach(() => {
            server.setResponseDelay('/', 200);
          });

          it('succeeds request when the timeout option is not set', async () => {
            crawler.queue({ url: INDEX_PAGE });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
          });

          it('succeeds request when the timeout option is disabled', async () => {
            crawler.queue({ url: INDEX_PAGE, timeout: 0 });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
          });

          it('succeeds request when the timeout option is longer than the response delay', async () => {
            crawler.queue({ url: INDEX_PAGE, timeout: 300 });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
          });

          it('fails request when the timeout option is shorter than the response delay', async () => {
            crawler.queue({ url: INDEX_PAGE, timeout: 100 });
            await crawler.onIdle();
            assert.equal(onError.callCount, 1);
            assert.ok(includes(onError.firstCall.args[0].message, 'Navigation Timeout Exceeded:'));
          });
        });

        context('when an image is responded after the timeout option', () => {
          beforeEach(() => {
            server.setContent('/', `<body><img src="${PREFIX}/empty.png"></body>`);
            server.setContent('/empty.png', '');
            server.setResponseDelay('/empty.png', 200);
          });

          it('fails request when the waitUntil option is not set', async () => {
            crawler.queue({ url: INDEX_PAGE, timeout: 100 });
            await crawler.onIdle();
            assert.equal(onError.callCount, 1);
            assert.ok(includes(onError.firstCall.args[0].message, 'Navigation Timeout Exceeded:'));
          });

          it("fails request with waitUntil = 'load'", async () => {
            crawler.queue({ url: INDEX_PAGE, timeout: 100, waitUntil: 'load' });
            await crawler.onIdle();
            assert.equal(onError.callCount, 1);
            assert.ok(includes(onError.firstCall.args[0].message, 'Navigation Timeout Exceeded:'));
          });

          it("succeeds request with waitUntil = 'domcontentloaded'", async () => {
            crawler.queue({ url: INDEX_PAGE, timeout: 100, waitUntil: 'domcontentloaded' });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
          });

          it("succeeds request with waitUntil = ['domcontentloaded']", async () => {
            crawler.queue({ url: INDEX_PAGE, timeout: 100, waitUntil: ['domcontentloaded'] });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
          });

          it("fails request with waitUntil = ['load', 'domcontentloaded']", async () => {
            crawler.queue({ url: INDEX_PAGE, timeout: 100, waitUntil: ['load', 'domcontentloaded'] });
            await crawler.onIdle();
            assert.equal(onError.callCount, 1);
            assert.ok(includes(onError.firstCall.args[0].message, 'Navigation Timeout Exceeded:'));
          });
        });
      });

      context('when the crawler is launched with maxConcurrency = 1', () => {
        beforeEach(async () => {
          crawler = await HCCrawler.launch(extend({
            onSuccess,
            maxConcurrency: 1,
          }, DEFAULT_OPTIONS));
        });

        it('does not throw an error when the delay option is set', async () => {
          crawler.queue({ url: INDEX_PAGE, delay: 100 });
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
        });

        it('does not crawl already cached urls', async () => {
          crawler.queue(`${PREFIX}/1.html`);
          crawler.queue(`${PREFIX}/2.html`);
          crawler.queue(`${PREFIX}/1.html`); // The queue won't be requested
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 2);
        });

        it('does not crawl twice if one url has a trailing slash on the root folder and the other does not', async () => {
          crawler.queue(`${PREFIX}`);
          crawler.queue(`${PREFIX}/`);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
        });

        it('obeys the priority order', async () => {
          crawler.queue({ url: `${PREFIX}/1.html`, priority: 1 });
          crawler.queue({ url: `${PREFIX}/2.html`, priority: 2 });
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 2);
          assert.equal(onSuccess.firstCall.args[0].options.url, `${PREFIX}/2.html`);
          assert.equal(onSuccess.secondCall.args[0].options.url, `${PREFIX}/1.html`);
        });

        it('crawls duplicate urls with skipDuplicates = false', async () => {
          crawler.queue({ url: `${PREFIX}/1.html` });
          crawler.queue({ url: `${PREFIX}/2.html` });
          crawler.queue({ url: `${PREFIX}/1.html` });
          crawler.queue({ url: `${PREFIX}/2.html`, skipDuplicates: false }); // The queue will be requested
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 3);
        });

        context('when the first page contains several links', () => {
          beforeEach(() => {
            server.setContent('/1.html', `
            go to <a href="${PREFIX}/2.html">/2.html</a>
            go to <a href="${PREFIX}/3.html">/3.html</a>
            `);
            server.setContent('/2.html', `go to <a href="${PREFIX}/4.html">/4.html</a>`);
          });

          it('follow links with depth first order (DFS) with maxDepth = 3', async () => {
            crawler.queue({ url: `${PREFIX}/1.html`, maxDepth: 3 });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 4);
            assert.equal(onSuccess.firstCall.args[0].depth, 1);
            assert.equal(onSuccess.secondCall.args[0].depth, 2);
            assert.equal(onSuccess.thirdCall.args[0].depth, 3);
          });

          it('follow links with breadth first order (BFS) with maxDepth = 3 and depthPriority = false', async () => {
            crawler.queue({ url: `${PREFIX}/1.html`, maxDepth: 3, depthPriority: false });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 4);
            assert.equal(onSuccess.firstCall.args[0].depth, 1);
            assert.equal(onSuccess.secondCall.args[0].depth, 2);
            assert.equal(onSuccess.thirdCall.args[0].depth, 2);
          });
        });
      });

      context('when the crawler is launched with the maxRequest option', () => {
        beforeEach(async () => {
          crawler = await HCCrawler.launch(extend({
            onSuccess,
            maxConcurrency: 1,
            maxRequest: 2,
          }, DEFAULT_OPTIONS));
        });

        it('pauses at the maxRequest option', async () => {
          let maxrequestreached = 0;
          crawler.on('maxrequestreached', () => { maxrequestreached += 1; });
          crawler.queue(`${PREFIX}/1.html`);
          crawler.queue(`${PREFIX}/2.html`);
          crawler.queue(`${PREFIX}/3.html`);
          await crawler.onIdle();
          assert.equal(maxrequestreached, 1);
          assert.equal(crawler.isPaused(), true);
          assert.equal(onSuccess.callCount, 2);
          const size = await crawler.queueSize();
          assert.equal(size, 1);
        });

        it('resumes from the maxRequest option', async () => {
          crawler.queue(`${PREFIX}/1.html`);
          crawler.queue(`${PREFIX}/2.html`);
          crawler.queue(`${PREFIX}/3.html`);
          await crawler.onIdle();
          assert.equal(crawler.isPaused(), true);
          assert.equal(onSuccess.callCount, 2);
          const size1 = await crawler.queueSize();
          assert.equal(size1, 1);
          crawler.setMaxRequest(4);
          crawler.resume();
          await crawler.onIdle();
          assert.equal(crawler.isPaused(), false);
          assert.equal(onSuccess.callCount, 3);
          const size2 = await crawler.queueSize();
          assert.equal(size2, 0);
        });
      });

      context('when the crawler is launched with the preRequest function', () => {
        context('when the preRequest function returns true', () => {
          function preRequest() {
            return true;
          }

          beforeEach(async () => {
            crawler = await HCCrawler.launch(extend({
              onSuccess,
              preRequest,
            }, DEFAULT_OPTIONS));
          });

          it('does not skip crawling', async () => {
            let requestskipped = 0;
            crawler.on('requestskipped', () => { requestskipped += 1; });
            crawler.queue(INDEX_PAGE);
            await crawler.onIdle();
            assert.equal(requestskipped, 0);
            assert.equal(onSuccess.callCount, 1);
          });
        });

        context('when the preRequest function returns false', () => {
          function preRequest() {
            return false;
          }

          beforeEach(async () => {
            crawler = await HCCrawler.launch(extend({
              onSuccess,
              preRequest,
            }, DEFAULT_OPTIONS));
          });

          it('skips crawling', async () => {
            let requestskipped = 0;
            crawler.on('requestskipped', () => { requestskipped += 1; });
            crawler.queue(INDEX_PAGE);
            await crawler.onIdle();
            assert.equal(requestskipped, 1);
            assert.equal(onSuccess.callCount, 0);
          });
        });

        context('when the preRequest function modifies options', () => {
          const path = './tmp/example.png';
          function preRequest(options) {
            options.screenshot = { path };
            return true;
          }

          beforeEach(async () => {
            crawler = await HCCrawler.launch(extend({
              onSuccess,
              preRequest,
            }, DEFAULT_OPTIONS));
          });

          it('modifies options', async () => {
            crawler.queue(INDEX_PAGE);
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
            assert.equal(onSuccess.firstCall.args[0].options.screenshot.path, path);
          });
        });
      });

      context('when the crawler is launched with the exporter option', () => {
        function removeTemporaryFile(file) {
          return new Promise(resolve => {
            unlink(file, (() => void resolve()));
          });
        }

        function readTemporaryFile(file) {
          return new Promise((resolve, reject) => {
            readFile(file, ENCODING, ((error, result) => {
              if (error) return reject(error);
              return resolve(result);
            }));
          });
        }

        afterEach(() => removeTemporaryFile(CSV_FILE));

        context('when the crawler is launched with exporter = CSVExporter', () => {
          beforeEach(async () => {
            await removeTemporaryFile(CSV_FILE);
            const exporter = new CSVExporter({
              file: CSV_FILE,
              fields: ['result'],
            });
            crawler = await HCCrawler.launch(extend({
              evaluatePage,
              onSuccess,
              exporter,
              maxConcurrency: 1,
            }, DEFAULT_OPTIONS));
          });

          it('exports a CSV file', async () => {
            crawler.queue(`${PREFIX}/1.html`);
            crawler.queue(`${PREFIX}/2.html`);
            await crawler.onIdle();
            const actual = await readTemporaryFile(CSV_FILE);
            const header = 'result\n';
            const line1 = '/1.html\n';
            const line2 = '/2.html\n';
            const expected = header + line1 + line2;
            assert.equal(actual, expected);
            assert.equal(onSuccess.callCount, 2);
          });
        });

        context('when the crawler is launched with exporter = JSONLineExporter', async () => {
          beforeEach(async () => {
            await removeTemporaryFile(JSON_FILE);
            const exporter = new JSONLineExporter({
              file: JSON_FILE,
              fields: ['result'],
            });
            crawler = await HCCrawler.launch(extend({
              evaluatePage,
              onSuccess,
              exporter,
              maxConcurrency: 1,
            }, DEFAULT_OPTIONS));
          });

          it('exports a json-line file', async () => {
            crawler.queue(`${PREFIX}/1.html`);
            crawler.queue(`${PREFIX}/2.html`);
            await crawler.onIdle();
            const actual = await readTemporaryFile(JSON_FILE);
            const line1 = `${JSON.stringify({ result: '/1.html' })}\n`;
            const line2 = `${JSON.stringify({ result: '/2.html' })}\n`;
            const expected = line1 + line2;
            assert.equal(actual, expected);
            assert.equal(onSuccess.callCount, 2);
          });
        });
      });

      context('when the crawler is launched with the redis cache', () => {
        context('for the fist time with persistCache = true', () => {
          beforeEach(async () => {
            const cache = new RedisCache();
            crawler = await HCCrawler.launch(extend({
              onSuccess,
              cache,
              persistCache: true,
            }, DEFAULT_OPTIONS));
          });

          it('crawls all queued urls', async () => {
            crawler.queue(`${PREFIX}/1.html`);
            crawler.queue(`${PREFIX}/2.html`);
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 2);
          });
        });

        context('for the second time', () => {
          beforeEach(async () => {
            const cache = new RedisCache();
            crawler = await HCCrawler.launch(extend({
              onSuccess,
              cache,
            }, DEFAULT_OPTIONS));
          });

          it('does not crawl already cached urls', async () => {
            crawler.queue(`${PREFIX}/2.html`);
            crawler.queue(`${PREFIX}/3.html`);
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
          });
        });
      });

      it('emits a disconnect event', async () => {
        crawler = await HCCrawler.launch(DEFAULT_OPTIONS);
        let disconnected = 0;
        crawler.on('disconnected', () => { disconnected += 1; });
        await crawler.close();
        assert.equal(disconnected, 1);
      });
    });

    context('when the server is not running', () => {
      beforeEach(async () => {
        crawler = await HCCrawler.launch(extend({ onError }, DEFAULT_OPTIONS));
      });

      it('retries and gives up', async () => {
        let requestretried = 0;
        let requestfailed = 0;
        crawler.on('requestretried', () => { requestretried += 1; });
        crawler.on('requestfailed', () => { requestfailed += 1; });
        crawler.queue({ url: INDEX_PAGE, retryCount: 3, retryDelay: 100 });
        await crawler.onIdle();
        assert.equal(requestretried, 3);
        assert.equal(requestfailed, 1);
        assert.equal(crawler.pendingQueueSize(), 0);
        assert.equal(crawler.requestedCount(), 1);
        assert.equal(onError.callCount, 1);
        assert.ok(includes(onError.firstCall.args[0].message, 'net::ERR_CONNECTION_REFUSED'));
      });
    });
  });
});
