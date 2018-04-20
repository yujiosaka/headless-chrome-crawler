const { unlink, readFile, existsSync } = require('fs');
const assert = require('assert');
const sinon = require('sinon');
const extend = require('lodash/extend');
const includes = require('lodash/includes');
const noop = require('lodash/noop');
const HCCrawler = require('../../');
const CSVExporter = require('../../exporter/csv');
const JSONLineExporter = require('../../exporter/json-line');
const Server = require('../server');

const PORT = 8080;
const PREFIX = `http://127.0.0.1:${PORT}`;
const INDEX_PAGE = `${PREFIX}/`;
const CSV_FILE = './tmp/result.csv';
const JSON_FILE = './tmp/result.json';
const PNG_FILE = './tmp/example.png';
const ENCODING = 'utf8';

const DEFAULT_OPTIONS = { args: ['--no-sandbox'] };

describe('HCCrawler', function () {
  describe('HCCrawler.executablePath', function () {
    it('returns the existing path', function () {
      const executablePath = HCCrawler.executablePath();
      assert.ok(existsSync(executablePath));
    });
  });

  describe('HCCrawler.defaultArgs', function () {
    it('returns the default chrome arguments', function () {
      const args = HCCrawler.defaultArgs();
      assert.ok(includes(args, '--no-first-run'));
    });
  });

  describe('HCCrawler.connect', function () {
    let crawler;

    beforeEach(async function () {
      crawler = await HCCrawler.launch(DEFAULT_OPTIONS);
    });

    afterEach(() => crawler.close());

    it('connects multiple times to the same crawler', async function () {
      const secondCrawler = await HCCrawler.connect({ browserWSEndpoint: crawler.wsEndpoint() });
      await secondCrawler.close();
    });

    it('reconnects to an already disconnected crawler', async function () {
      const browserWSEndpoint = crawler.wsEndpoint();
      await crawler.disconnect();
      crawler = await HCCrawler.connect({ browserWSEndpoint });
    });
  });

  describe('HCCrawler.launch', function () {
    let crawler;
    let onSuccess;
    let onError;

    beforeEach(function () {
      onSuccess = sinon.spy();
      onError = sinon.spy();
    });

    afterEach(() => crawler.close());

    it('launches a crawler', async function () {
      crawler = await HCCrawler.launch(DEFAULT_OPTIONS);
    });

    context('when the server is running', function () {
      let server;

      function evaluatePage() {
        return $('body').text();
      }

      before(async function () {
        server = await Server.run(PORT);
      });

      after(() => server.stop());

      beforeEach(function () {
        server.reset();
      });

      it('emits a disconnect event', async function () {
        crawler = await HCCrawler.launch(DEFAULT_OPTIONS);
        let disconnected = 0;
        crawler.on('disconnected', () => { disconnected += 1; });
        await crawler.close();
        assert.equal(disconnected, 1);
      });

      context('when the crawler is launched with necessary options', function () {
        beforeEach(async function () {
          crawler = await HCCrawler.launch(extend({ onSuccess }, DEFAULT_OPTIONS));
        });

        it('shows the browser version', async function () {
          const version = await crawler.version();
          assert.ok(includes(version, 'HeadlessChrome'));
        });

        it('shows the default user agent', async function () {
          const userAgent = await crawler.userAgent();
          assert.ok(includes(userAgent, 'HeadlessChrome'));
        });

        it('shows the WebSocket endpoint', function () {
          assert.ok(includes(crawler.wsEndpoint(), 'ws://'));
        });

        it('throws an error when queueing null', async function () {
          try {
            await crawler.queue(null);
          } catch (error) {
            assert.equal(error.message, 'Url must be defined!');
          }
        });

        it('throws an error when queueing options without URL', async function () {
          try {
            await crawler.queue();
          } catch (error) {
            assert.equal(error.message, 'Url must be defined!');
          }
        });

        it('crawls when queueing necessary options', async function () {
          let requeststarted = 0;
          let requestfinished = 0;
          crawler.on('requeststarted', () => { requeststarted += 1; });
          crawler.on('requestfinished', () => { requestfinished += 1; });
          await crawler.queue(INDEX_PAGE);
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

        it('crawls when queueing a string', async function () {
          await crawler.queue(INDEX_PAGE);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
        });

        it('crawls when queueing multiple strings', async function () {
          await crawler.queue([`${PREFIX}/1.html`, `${PREFIX}/2.html`, `${PREFIX}/3.html`]);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 3);
        });

        it('crawls when queueing an object', async function () {
          await crawler.queue({ url: INDEX_PAGE });
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
        });

        it('crawls when queueing multiple objects', async function () {
          await crawler.queue([{ url: `${PREFIX}/1.html` }, { url: `${PREFIX}/2.html` }]);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 2);
        });

        it('crawls when queueing mixed styles', async function () {
          await crawler.queue([`${PREFIX}/1.html`, { url: `${PREFIX}/2.html` }]);
          await crawler.queue(`${PREFIX}/3.html`);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 3);
        });

        it('throws an error when overriding the onSuccess function', async function () {
          try {
            await crawler.queue({ url: INDEX_PAGE, onSuccess: noop });
          } catch (error) {
            assert.equal(error.message, 'Overriding onSuccess is not allowed!');
          }
        });

        it('throws an error when queueing options with an unavailable device', async function () {
          try {
            await crawler.queue({ url: INDEX_PAGE, device: 'do-not-exist' });
          } catch (error) {
            assert.equal(error.message, 'Specified device is not supported!');
          }
        });

        it('throws an error when the delay option is set', async function () {
          try {
            await crawler.queue({ url: INDEX_PAGE, delay: 100 });
          } catch (error) {
            assert.equal(error.message, 'Max concurrency must be 1 when delay is set!');
          }
        });

        it('emits a newpage event', async function () {
          let request;
          let response;
          crawler.on('newpage', page => {
            page.on('request', _request => { request = _request; });
            page.on('response', _response => { response = _response; });
          });
          await crawler.queue(INDEX_PAGE);
          await crawler.onIdle();
          assert.equal(request.response(), response);
          assert.equal(onSuccess.callCount, 1);
        });

        it('crawls when the requested domain exactly matches allowed domains', async function () {
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          await crawler.queue({ url: INDEX_PAGE, allowedDomains: ['127.0.0.1'] });
          await crawler.onIdle();
          assert.equal(requestskipped, 0);
          assert.equal(onSuccess.callCount, 1);
        });

        it('crawls when the requested domain matches allowed domains by the regular expression', async function () {
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          await crawler.queue({ url: INDEX_PAGE, allowedDomains: [/\d+\.\d+\.\d+\.\d+/] });
          await crawler.onIdle();
          assert.equal(requestskipped, 0);
          assert.equal(onSuccess.callCount, 1);
        });

        it('skips crawling when the requested domain does not match allowed domains', async function () {
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          await crawler.queue({ url: INDEX_PAGE, allowedDomains: ['0.0.0.0'] });
          await crawler.onIdle();
          assert.equal(requestskipped, 1);
          assert.equal(onSuccess.callCount, 0);
        });

        it('skips crawling when the requested domain exactly matches denied domains', async function () {
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          await crawler.queue({ url: INDEX_PAGE, deniedDomains: ['127.0.0.1'] });
          await crawler.onIdle();
          assert.equal(requestskipped, 1);
          assert.equal(onSuccess.callCount, 0);
        });

        it('skips crawling when the requested domain matches denied domains by the regular expression', async function () {
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          await crawler.queue({ url: INDEX_PAGE, deniedDomains: [/\d+\.\d+\.\d+\.\d+/] });
          await crawler.onIdle();
          assert.equal(requestskipped, 1);
          assert.equal(onSuccess.callCount, 0);
        });

        it('follows links when the maxDepth option is set', async function () {
          let maxdepthreached = 0;
          server.setContent('/1.html', `go to <a href="${PREFIX}/2.html">/2.html</a>`);
          crawler.on('maxdepthreached', () => { maxdepthreached += 1; });
          await crawler.queue({ url: `${PREFIX}/1.html`, maxDepth: 2 });
          await crawler.onIdle();
          assert.equal(maxdepthreached, 1);
          assert.equal(onSuccess.callCount, 2);
          assert.deepEqual(onSuccess.firstCall.args[0].links, [`${PREFIX}/2.html`]);
          assert.equal(onSuccess.secondCall.args[0].depth, 2);
        });

        it('crawls regardless of alert dialogs', async function () {
          server.setContent('/', `<script>alert('Welcome to ${INDEX_PAGE}');</script>`);
          await crawler.queue(INDEX_PAGE);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
        });

        it('crawls when the path is allowed by the robots.txt', async function () {
          server.setContent('/robots.txt', 'User-agent: *\nAllow: /');
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          await crawler.queue(INDEX_PAGE);
          await crawler.onIdle();
          assert.equal(requestskipped, 0);
          assert.equal(onSuccess.callCount, 1);
        });

        it('skips crawling when the path is not allowed by the robots.txt', async function () {
          server.setContent('/robots.txt', 'User-agent: *\nDisallow: /');
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          await crawler.queue(INDEX_PAGE);
          await crawler.onIdle();
          assert.equal(requestskipped, 1);
          assert.equal(onSuccess.callCount, 0);
        });

        it('stops crawling when allowed and disallowed paths are mixed', async function () {
          server.setContent('/robots.txt', 'User-agent: *\nDisallow: /2.html');
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          await crawler.queue(`${PREFIX}/1.html`);
          await crawler.queue(`${PREFIX}/2.html`);
          await crawler.onIdle();
          assert.equal(requestskipped, 1);
          assert.equal(onSuccess.callCount, 1);
        });

        it('does not obey the robots.txt with obeyRobotsTxt = false', async function () {
          server.setContent('/robots.txt', 'User-agent: *\nDisallow: /');
          let requestskipped = 0;
          crawler.on('requestskipped', () => { requestskipped += 1; });
          await crawler.queue({ url: INDEX_PAGE, obeyRobotsTxt: false });
          await crawler.onIdle();
          assert.equal(requestskipped, 0);
          assert.equal(onSuccess.callCount, 1);
        });

        context('when the content rendering is delayed', function () {
          beforeEach(function () {
            server.setContent('/', `
            <script>
            setTimeout(() => {
              window.document.write('<h1>Welcome to ${INDEX_PAGE}</h1>');
            }, 100);
            </script>
            `);
          });

          it('fails evaluating the delayed content without the waitFor option', async function () {
            await crawler.queue({
              url: INDEX_PAGE,
              evaluatePage,
            });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
            assert.equal(onSuccess.firstCall.args[0].result, '');
          });

          it('succeeds evaluating the delayed content with the waitFor timeout option', async function () {
            await crawler.queue({
              url: INDEX_PAGE,
              waitFor: { selectorOrFunctionOrTimeout: 150 },
              evaluatePage,
            });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
            assert.ok(includes(onSuccess.firstCall.args[0].result, 'Welcome to'));
          });

          it('succeeds evaluating the delayed content with the waitFor selector option', async function () {
            await crawler.queue({
              url: INDEX_PAGE,
              waitFor: { selectorOrFunctionOrTimeout: 'h1' },
              evaluatePage,
            });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
            assert.ok(includes(onSuccess.firstCall.args[0].result, 'Welcome to'));
          });

          it('succeeds evaluating the delayed content with the waitFor function', async function () {
            await crawler.queue({
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

        context('when the page requires the basic authentication', function () {
          beforeEach(function () {
            server.setContent('/', 'Authorization succeeded!');
            server.setAuth('/', 'username', 'password');
          });

          it('fails authentication when username and password options are not set', async function () {
            await crawler.queue({
              url: INDEX_PAGE,
              evaluatePage,
            });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
            assert.equal(onSuccess.firstCall.args[0].result, 'HTTP Error 401 Unauthorized: Access is denied');
          });

          it('fails authentication when wrong username and password options are set', async function () {
            await crawler.queue({
              url: INDEX_PAGE,
              username: 'password',
              password: 'username',
              evaluatePage,
            });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
            assert.equal(onSuccess.firstCall.args[0].result, 'HTTP Error 401 Unauthorized: Access is denied');
          });

          it('passes authentication when proper username and password options are set', async function () {
            await crawler.queue({
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

        context('when the sitemap.xml is referred by the robots.txt', function () {
          beforeEach(function () {
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

          it('does not follow the sitemap.xml', async function () {
            await crawler.queue(`${PREFIX}/1.html`);
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
          });

          it('follows the sitemap.xml with followSitemapXml = true', async function () {
            await crawler.queue({ url: `${PREFIX}/1.html`, followSitemapXml: true });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 2);
          });
        });
      });

      context('when the crawler is launched with the device option', function () {
        beforeEach(async function () {
          server.setContent('/', '<script>window.document.write(window.navigator.userAgent);</script>');
          crawler = await HCCrawler.launch(extend({
            onSuccess,
            evaluatePage,
            device: 'iPhone 6',
          }, DEFAULT_OPTIONS));
        });

        it('modifies the userAgent', async function () {
          await crawler.queue(INDEX_PAGE);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
          assert.ok(includes(onSuccess.firstCall.args[0].result, 'iPhone'));
        });

        it("overrides the device with device = 'Nexus 6'", async function () {
          await crawler.queue({ url: INDEX_PAGE, device: 'Nexus 6' });
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
          assert.ok(includes(onSuccess.firstCall.args[0].result, 'Nexus 6'));
        });

        it("overrides the user agent with userAgent = 'headless-chrome-crawler'", async function () {
          await crawler.queue({ url: INDEX_PAGE, userAgent: 'headless-chrome-crawler' });
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
          assert.equal(onSuccess.firstCall.args[0].result, 'headless-chrome-crawler');
        });
      });

      context('when the crawler is launched with retryCount = 0', function () {
        beforeEach(async function () {
          crawler = await HCCrawler.launch(extend({
            onSuccess,
            onError,
            retryCount: 0,
          }, DEFAULT_OPTIONS));
        });

        it('succeeds evaluating page', async function () {
          await crawler.queue({ url: INDEX_PAGE, evaluatePage });
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
          assert.equal(onSuccess.firstCall.args[0].result, '/');
        });

        it('fails evaluating page with jQuery = false', async function () {
          await crawler.queue({ url: INDEX_PAGE, jQuery: false, evaluatePage });
          await crawler.onIdle();
          assert.equal(onError.callCount, 1);
          assert.ok(includes(onError.firstCall.args[0].message, 'Evaluation failed:'));
        });

        context('when the page response is delayed', async function () {
          beforeEach(function () {
            server.setResponseDelay('/', 200);
          });

          it('succeeds request when the timeout option is not set', async function () {
            await crawler.queue({ url: INDEX_PAGE });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
          });

          it('succeeds request when the timeout option is disabled', async function () {
            await crawler.queue({ url: INDEX_PAGE, timeout: 0 });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
          });

          it('succeeds request when the timeout option is longer than the response delay', async function () {
            await crawler.queue({ url: INDEX_PAGE, timeout: 300 });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
          });

          it('fails request when the timeout option is shorter than the response delay', async function () {
            await crawler.queue({ url: INDEX_PAGE, timeout: 100 });
            await crawler.onIdle();
            assert.equal(onError.callCount, 1);
            assert.ok(includes(onError.firstCall.args[0].message, 'Navigation Timeout Exceeded:'));
          });
        });

        context('when an image is responded after the timeout option', function () {
          beforeEach(function () {
            server.setContent('/', `<body><img src="${PREFIX}/empty.png"></body>`);
            server.setContent('/empty.png', '');
            server.setResponseDelay('/empty.png', 200);
          });

          it('fails request when the waitUntil option is not set', async function () {
            await crawler.queue({ url: INDEX_PAGE, timeout: 100 });
            await crawler.onIdle();
            assert.equal(onError.callCount, 1);
            assert.ok(includes(onError.firstCall.args[0].message, 'Navigation Timeout Exceeded:'));
          });

          it("fails request with waitUntil = 'load'", async function () {
            await crawler.queue({ url: INDEX_PAGE, timeout: 100, waitUntil: 'load' });
            await crawler.onIdle();
            assert.equal(onError.callCount, 1);
            assert.ok(includes(onError.firstCall.args[0].message, 'Navigation Timeout Exceeded:'));
          });

          it("succeeds request with waitUntil = 'domcontentloaded'", async function () {
            await crawler.queue({ url: INDEX_PAGE, timeout: 100, waitUntil: 'domcontentloaded' });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
          });

          it("succeeds request with waitUntil = ['domcontentloaded']", async function () {
            await crawler.queue({ url: INDEX_PAGE, timeout: 100, waitUntil: ['domcontentloaded'] });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
          });

          it("fails request with waitUntil = ['load', 'domcontentloaded']", async function () {
            await crawler.queue({ url: INDEX_PAGE, timeout: 100, waitUntil: ['load', 'domcontentloaded'] });
            await crawler.onIdle();
            assert.equal(onError.callCount, 1);
            assert.ok(includes(onError.firstCall.args[0].message, 'Navigation Timeout Exceeded:'));
          });
        });
      });

      context('when the crawler is launched with maxConcurrency = 1', function () {
        beforeEach(async function () {
          crawler = await HCCrawler.launch(extend({
            onSuccess,
            maxConcurrency: 1,
          }, DEFAULT_OPTIONS));
        });

        it('does not throw an error when the delay option is set', async function () {
          await crawler.queue({ url: INDEX_PAGE, delay: 100 });
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
        });

        it('does not crawl already cached urls', async function () {
          await crawler.queue(`${PREFIX}/1.html`);
          await crawler.queue(`${PREFIX}/2.html`);
          await crawler.queue(`${PREFIX}/1.html`); // The queue won't be requested
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 2);
        });

        it('does not crawl twice if one url has a trailing slash on the root folder and the other does not', async function () {
          await crawler.queue(`${PREFIX}`);
          await crawler.queue(`${PREFIX}/`);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 1);
        });

        it('obeys the priority order', async function () {
          await Promise.all([
            crawler.queue({ url: `${PREFIX}/1.html`, priority: 1 }),
            crawler.queue({ url: `${PREFIX}/2.html`, priority: 2 }),
          ]);
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 2);
          assert.equal(onSuccess.firstCall.args[0].options.url, `${PREFIX}/2.html`);
          assert.equal(onSuccess.secondCall.args[0].options.url, `${PREFIX}/1.html`);
        });

        it('crawls duplicate urls with skipDuplicates = false', async function () {
          await crawler.queue({ url: `${PREFIX}/1.html` });
          await crawler.queue({ url: `${PREFIX}/2.html` });
          await crawler.queue({ url: `${PREFIX}/1.html` });
          await crawler.queue({ url: `${PREFIX}/2.html`, skipDuplicates: false }); // The queue will be requested
          await crawler.onIdle();
          assert.equal(onSuccess.callCount, 3);
        });

        context('when the first page contains several links', function () {
          beforeEach(function () {
            server.setContent('/1.html', `
            go to <a href="${PREFIX}/2.html">/2.html</a>
            go to <a href="${PREFIX}/3.html">/3.html</a>
            `);
            server.setContent('/2.html', `go to <a href="${PREFIX}/4.html">/4.html</a>`);
          });

          it('follow links with depth first order (DFS) with maxDepth = 3', async function () {
            await crawler.queue({ url: `${PREFIX}/1.html`, maxDepth: 3 });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 4);
            assert.equal(onSuccess.firstCall.args[0].depth, 1);
            assert.equal(onSuccess.secondCall.args[0].depth, 2);
            assert.equal(onSuccess.thirdCall.args[0].depth, 3);
          });

          it('follow links with breadth first order (BFS) with maxDepth = 3 and depthPriority = false', async function () {
            await crawler.queue({ url: `${PREFIX}/1.html`, maxDepth: 3, depthPriority: false });
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 4);
            assert.equal(onSuccess.firstCall.args[0].depth, 1);
            assert.equal(onSuccess.secondCall.args[0].depth, 2);
            assert.equal(onSuccess.thirdCall.args[0].depth, 2);
          });
        });
      });

      context('when the crawler is launched with the maxRequest option', function () {
        beforeEach(async function () {
          crawler = await HCCrawler.launch(extend({
            onSuccess,
            maxConcurrency: 1,
            maxRequest: 2,
          }, DEFAULT_OPTIONS));
        });

        it('pauses at the maxRequest option', async function () {
          let maxrequestreached = 0;
          crawler.on('maxrequestreached', () => { maxrequestreached += 1; });
          await crawler.queue(`${PREFIX}/1.html`);
          await crawler.queue(`${PREFIX}/2.html`);
          await crawler.queue(`${PREFIX}/3.html`);
          await crawler.onIdle();
          assert.equal(maxrequestreached, 1);
          assert.equal(crawler.isPaused(), true);
          assert.equal(onSuccess.callCount, 2);
          const size = await crawler.queueSize();
          assert.equal(size, 1);
        });

        it('resumes from the maxRequest option', async function () {
          await crawler.queue(`${PREFIX}/1.html`);
          await crawler.queue(`${PREFIX}/2.html`);
          await crawler.queue(`${PREFIX}/3.html`);
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

      context('when the crawler is launched with the preRequest function', function () {
        context('when the preRequest function returns true', function () {
          function preRequest() {
            return true;
          }

          beforeEach(async function () {
            crawler = await HCCrawler.launch(extend({
              onSuccess,
              preRequest,
            }, DEFAULT_OPTIONS));
          });

          it('does not skip crawling', async function () {
            let requestskipped = 0;
            crawler.on('requestskipped', () => { requestskipped += 1; });
            await crawler.queue(INDEX_PAGE);
            await crawler.onIdle();
            assert.equal(requestskipped, 0);
            assert.equal(onSuccess.callCount, 1);
          });
        });

        context('when the preRequest function returns false', function () {
          function preRequest() {
            return false;
          }

          beforeEach(async function () {
            crawler = await HCCrawler.launch(extend({
              onSuccess,
              preRequest,
            }, DEFAULT_OPTIONS));
          });

          it('skips crawling', async function () {
            let requestskipped = 0;
            crawler.on('requestskipped', () => { requestskipped += 1; });
            await crawler.queue(INDEX_PAGE);
            await crawler.onIdle();
            assert.equal(requestskipped, 1);
            assert.equal(onSuccess.callCount, 0);
          });
        });

        context('when the preRequest function modifies options', function () {
          function preRequest(options) {
            options.screenshot = { path: PNG_FILE };
            return true;
          }

          beforeEach(async function () {
            crawler = await HCCrawler.launch(extend({
              onSuccess,
              preRequest,
            }, DEFAULT_OPTIONS));
          });

          it('modifies options', async function () {
            await crawler.queue(INDEX_PAGE);
            await crawler.onIdle();
            assert.equal(onSuccess.callCount, 1);
            assert.equal(onSuccess.firstCall.args[0].options.screenshot.path, PNG_FILE);
          });
        });
      });

      context('when the crawler is launched with the exporter option', function () {
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

        context('when the crawler is launched with exporter = CSVExporter', function () {
          beforeEach(async function () {
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

          it('exports a CSV file', async function () {
            await crawler.queue(`${PREFIX}/1.html`);
            await crawler.queue(`${PREFIX}/2.html`);
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

        context('when the crawler is launched with exporter = JSONLineExporter', async function () {
          beforeEach(async function () {
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

          it('exports a json-line file', async function () {
            await crawler.queue(`${PREFIX}/1.html`);
            await crawler.queue(`${PREFIX}/2.html`);
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
    });

    context('when the server is not running', function () {
      beforeEach(async function () {
        crawler = await HCCrawler.launch(extend({ onError }, DEFAULT_OPTIONS));
      });

      it('retries and gives up', async function () {
        let requestretried = 0;
        let requestfailed = 0;
        crawler.on('requestretried', () => { requestretried += 1; });
        crawler.on('requestfailed', () => { requestfailed += 1; });
        await crawler.queue({ url: INDEX_PAGE, retryCount: 3, retryDelay: 100 });
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
