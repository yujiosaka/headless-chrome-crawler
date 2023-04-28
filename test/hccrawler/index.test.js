const { unlink, readFile, existsSync } = require('fs');
const extend = require('lodash/extend');
const noop = require('lodash/noop');
const HCCrawler = require('../..');
const CSVExporter = require('../../exporter/csv');
const JSONLineExporter = require('../../exporter/json-line');
const Server = require('../server');

const PORT = 5753;
const PREFIX = `http://127.0.0.1:${PORT}`;
const INDEX_PAGE = `${PREFIX}/`;
const CSV_FILE = './tmp/result.csv';
const JSON_FILE = './tmp/result.json';
const PNG_FILE = './tmp/example.png';
const ENCODING = 'utf8';
const TEST_TIMEOUT = 10000;

const DEFAULT_OPTIONS = { headless: 'new', args: ['--no-sandbox'] };

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

    afterEach(() => this.crawler && this.crawler.close());

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

    afterEach(() => this.crawler && this.crawler.close());

    test('launches a crawler', async () => {
      this.crawler = await HCCrawler.launch(DEFAULT_OPTIONS);
    });

    describe('when the server is running', () => {
      function evaluatePage() {
        return $('body').text();
      }

      beforeAll(async () => {
        this.server = await Server.run(PORT);
      });

      afterAll(() => {
        (this.server !== undefined) && this.server.stop();
      });

      beforeEach(() => {
        (this.server !== undefined) && this.server.reset();
      });

      test('emits a disconnect event', async () => {
        this.crawler = await HCCrawler.launch(DEFAULT_OPTIONS);
        let disconnected = 0;
        this.crawler.on('disconnected', () => { disconnected += 1; });
        await this.crawler.close();
        expect(disconnected).toBe(1);
      });

      describe('when the crawler is launched with necessary options', () => {
        beforeEach(async () => {
          this.crawler = await HCCrawler.launch(extend({
            evaluatePage,
            onSuccess: this.onSuccess,
            onError: this.onError,
          }, DEFAULT_OPTIONS));
        });

        test('shows the browser version', async () => {
          const version = await this.crawler.version();
          // expect(version).toContain('Chrome/');
          expect(version).toContain('Chrome/');
        });

        test('shows the default user agent', async () => {
          const userAgent = await this.crawler.userAgent();
          // expect(userAgent).toContain('HeadlessChrome');
          expect(userAgent).toContain('Chrome/');
        });

        test('shows the WebSocket endpoint', () => {
          expect(this.crawler.wsEndpoint()).toContain('ws://');
        });

        test('throws an error when queueing null', async () => {
          try {
            await this.crawler.queue(null);
          } catch (error) {
            expect(error.message).toBe('Url must be defined!');
          }
        });

        test('throws an error when queueing options without URL', async () => {
          try {
            await this.crawler.queue();
          } catch (error) {
            expect(error.message).toBe('Url must be defined!');
          }
        });

        test('crawls when queueing necessary options', async () => {
          let requeststarted = 0;
          let requestfinished = 0;
          this.crawler.on('requeststarted', () => { requeststarted += 1; });
          this.crawler.on('requestfinished', () => { requestfinished += 1; });
          await this.crawler.queue(INDEX_PAGE);
          await this.crawler.onIdle();
          expect(requeststarted).toBe(1);
          expect(requestfinished).toBe(1);
          expect(this.crawler.pendingQueueSize()).toBe(0);
          expect(this.crawler.requestedCount()).toBe(1);
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
          expect(this.onSuccess.mock.calls[0][0].options.url).toBe(INDEX_PAGE);
          expect(this.onSuccess.mock.calls[0][0].response.ok).toBe(true);
          expect(this.onSuccess.mock.calls[0][0].response.status).toBe(200);
          expect(this.onSuccess.mock.calls[0][0].response.url).toBe(INDEX_PAGE);
        });

        test('crawls when queueing a string', async () => {
          await this.crawler.queue(INDEX_PAGE);
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
        });

        test('crawls when queueing multiple strings', async () => {
          await this.crawler.queue([`${PREFIX}/1.html`, `${PREFIX}/2.html`, `${PREFIX}/3.html`]);
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(3);
        });

        test('crawls when queueing an object', async () => {
          await this.crawler.queue({ url: INDEX_PAGE });
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
        });

        test('crawls when queueing multiple objects', async () => {
          await this.crawler.queue([{ url: `${PREFIX}/1.html` }, { url: `${PREFIX}/2.html` }]);
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(2);
        });

        test('crawls when queueing mixed styles', async () => {
          await this.crawler.queue([`${PREFIX}/1.html`, { url: `${PREFIX}/2.html` }]);
          await this.crawler.queue(`${PREFIX}/3.html`);
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(3);
        });

        test('throws an error when overriding the onSuccess function', async () => {
          try {
            await this.crawler.queue({ url: INDEX_PAGE, onSuccess: noop });
          } catch (error) {
            expect(error.message).toBe('Overriding onSuccess is not allowed!');
          }
        });

        test('throws an error when queueing options with an unavailable device', async () => {
          try {
            await this.crawler.queue({ url: INDEX_PAGE, device: 'do-not-exist' });
          } catch (error) {
            expect(error.message).toBe('Specified device is not supported!');
          }
        });

        test('throws an error when the delay option is set', async () => {
          try {
            await this.crawler.queue({ url: INDEX_PAGE, delay: 100 });
          } catch (error) {
            expect(error.message).toBe('Max concurrency must be 1 when delay is set!');
          }
        });

        test('crawls when the requested domain exactly matches allowed domains', async () => {
          let requestskipped = 0;
          this.crawler.on('requestskipped', () => { requestskipped += 1; });
          await this.crawler.queue({ url: INDEX_PAGE, allowedDomains: ['127.0.0.1'] });
          await this.crawler.onIdle();
          expect(requestskipped).toBe(0);
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
        });

        test('crawls when the requested domain matches allowed domains by the regular expression', async () => {
          let requestskipped = 0;
          this.crawler.on('requestskipped', () => { requestskipped += 1; });
          await this.crawler.queue({ url: INDEX_PAGE, allowedDomains: [/\d+\.\d+\.\d+\.\d+/] });
          await this.crawler.onIdle();
          expect(requestskipped).toBe(0);
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
        });

        test('skips crawling when the requested domain does not match allowed domains', async () => {
          let requestskipped = 0;
          this.crawler.on('requestskipped', () => { requestskipped += 1; });
          await this.crawler.queue({ url: INDEX_PAGE, allowedDomains: ['0.0.0.0'] });
          await this.crawler.onIdle();
          expect(requestskipped).toBe(1);
          expect(this.onSuccess).toHaveBeenCalledTimes(0);
        });

        test('skips crawling when the requested domain exactly matches denied domains', async () => {
          let requestskipped = 0;
          this.crawler.on('requestskipped', () => { requestskipped += 1; });
          await this.crawler.queue({ url: INDEX_PAGE, deniedDomains: ['127.0.0.1'] });
          await this.crawler.onIdle();
          expect(requestskipped).toBe(1);
          expect(this.onSuccess).toHaveBeenCalledTimes(0);
        });

        test('skips crawling when the requested domain matches denied domains by the regular expression', async () => {
          let requestskipped = 0;
          this.crawler.on('requestskipped', () => { requestskipped += 1; });
          await this.crawler.queue({ url: INDEX_PAGE, deniedDomains: [/\d+\.\d+\.\d+\.\d+/] });
          await this.crawler.onIdle();
          expect(requestskipped).toBe(1);
          expect(this.onSuccess).toHaveBeenCalledTimes(0);
        });

        test('follows links when the maxDepth option is set', async () => {
          let maxdepthreached = 0;
          this.server.setContent('/1.html', `go to <a href="${PREFIX}/2.html">/2.html</a>`);
          this.crawler.on('maxdepthreached', () => { maxdepthreached += 1; });
          await this.crawler.queue({ url: `${PREFIX}/1.html`, maxDepth: 2 });
          await this.crawler.onIdle();
          expect(maxdepthreached).toBe(1);
          expect(this.onSuccess).toHaveBeenCalledTimes(2);
          expect(this.onSuccess.mock.calls[0][0].links).toEqual([`${PREFIX}/2.html`]);
          expect(this.onSuccess.mock.calls[1][0].depth).toBe(2);
          expect(this.onSuccess.mock.calls[1][0].previousUrl).toBe(`${PREFIX}/1.html`);
        });

        test('crawls regardless of alert dialogs', async () => {
          this.server.setContent('/', `<script>alert('Welcome to ${INDEX_PAGE}');</script>`);
          await this.crawler.queue(INDEX_PAGE);
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
        });

        test('crawls when the path is allowed by the robots.txt', async () => {
          this.server.setContent('/robots.txt', 'User-agent: *\nAllow: /');
          let requestdisallowed = 0;
          this.crawler.on('requestdisallowed', () => { requestdisallowed += 1; });
          await this.crawler.queue(INDEX_PAGE);
          await this.crawler.onIdle();
          expect(requestdisallowed).toBe(0);
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
        });

        test('skips crawling when the path is not allowed by the robots.txt', async () => {
          this.server.setContent('/robots.txt', 'User-agent: *\nDisallow: /');
          let requestdisallowed = 0;
          this.crawler.on('requestdisallowed', () => { requestdisallowed += 1; });
          await this.crawler.queue(INDEX_PAGE);
          await this.crawler.onIdle();
          expect(requestdisallowed).toBe(1);
          expect(this.onSuccess).toHaveBeenCalledTimes(0);
        });

        test('stops crawling when allowed and disallowed paths are mixed', async () => {
          this.server.setContent('/robots.txt', 'User-agent: *\nDisallow: /2.html');
          let requestdisallowed = 0;
          this.crawler.on('requestdisallowed', () => { requestdisallowed += 1; });
          await this.crawler.queue(`${PREFIX}/1.html`);
          await this.crawler.queue(`${PREFIX}/2.html`);
          await this.crawler.onIdle();
          expect(requestdisallowed).toBe(1);
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
        });

        test('does not obey the robots.txt with obeyRobotsTxt = false', async () => {
          this.server.setContent('/robots.txt', 'User-agent: *\nDisallow: /');
          let requestdisallowed = 0;
          this.crawler.on('requestdisallowed', () => { requestdisallowed += 1; });
          await this.crawler.queue({ url: INDEX_PAGE, obeyRobotsTxt: false });
          await this.crawler.onIdle();
          expect(requestdisallowed).toBe(0);
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
        });

        describe('when the content rendering is delayed', () => {
          beforeEach(() => {
            this.server.setContent('/', `
            <script>
            setTimeout(() => {
              window.document.write('<h1>Welcome to ${INDEX_PAGE}</h1>');
            }, 200);
            </script>
            `);
          });

          test('fails evaluating the delayed content without the waitFor option', async () => {
            await this.crawler.queue(INDEX_PAGE);
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
            expect(this.onSuccess.mock.calls[0][0].result).toBe('');
          });

          test('succeeds evaluating the delayed content with the waitFor timeout option', async () => {
            await this.crawler.queue({
              url: INDEX_PAGE,
              waitForTimeout: 400,
            });
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
            expect(this.onSuccess.mock.calls[0][0].result).toContain('Welcome to');
          });

          test('succeeds evaluating the delayed content with the waitFor selector option', async () => {
            await this.crawler.queue({
              url: INDEX_PAGE,
              waitForSelector: 'h1',
            });
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
            expect(this.onSuccess.mock.calls[0][0].result).toContain('Welcome to');
          });

          test('succeeds evaluating the delayed content with the waitFor function', async () => {
            await this.crawler.queue({
              url: INDEX_PAGE,
              waitFor: {
                selectorOrFunctionOrTimeout: (expected => (
                  window.document.body.innerText.includes(expected)
                )),
                args: ['Welcome to'],
              },
            });
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
            expect(this.onSuccess.mock.calls[0][0].result).toContain('Welcome to');
          });
        });

        describe('when the page is redirected multiple times', () => {
          beforeEach(() => {
            this.server.setRedirect('/1.html', '/2.html');
            this.server.setRedirect('/2.html', '/3.html');
          });

          test('resolves a redirect chain', async () => {
            await this.crawler.queue(`${PREFIX}/1.html`);
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
            expect(this.onSuccess.mock.calls[0][0].result).toBe('/3.html');
            expect(this.onSuccess.mock.calls[0][0].redirectChain).toHaveLength(2);
            expect(this.onSuccess.mock.calls[0][0].redirectChain[0].url).toBe(`${PREFIX}/1.html`);
            expect(this.onSuccess.mock.calls[0][0].redirectChain[1].url).toBe(`${PREFIX}/2.html`);
          });

          test('requested already requested redirects', async () => {
            await this.crawler.queue(`${PREFIX}/1.html`);
            await this.crawler.onIdle();
            await this.crawler.queue(`${PREFIX}/2.html`);
            await this.crawler.queue(`${PREFIX}/3.html`);
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(3);
          });

          test('skips already requested redirects with skipRequestedRedirect = true', async () => {
            await this.crawler.queue({ url: `${PREFIX}/1.html`, skipRequestedRedirect: true });
            await this.crawler.onIdle();
            await this.crawler.queue({ url: `${PREFIX}/2.html`, skipRequestedRedirect: true });
            await this.crawler.queue({ url: `${PREFIX}/3.html`, skipRequestedRedirect: true });
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
          });
        });

        describe('when the page sets cookies', () => {
          beforeEach(async () => {
            this.server.setContent('/', "<script>document.cookie = 'username=yujiosaka';</script>");
          });

          test('resolves the cookies set in the page', async () => {
            await this.crawler.queue(INDEX_PAGE);
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
            expect(this.onSuccess.mock.calls[0][0].cookies).toHaveLength(1);
            expect(this.onSuccess.mock.calls[0][0].cookies[0].name).toBe('username');
            expect(this.onSuccess.mock.calls[0][0].cookies[0].value).toBe('yujiosaka');
          });

          test('resolves the cookies set both in the page by the crawler', async () => {
            await this.crawler.queue({
              url: INDEX_PAGE,
              cookies: [{ name: 'sessionid', value: '4ec74265ba314bb0e47d4a615e9dd031', domain: '127.0.0.1' }],
            });
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
            expect(this.onSuccess.mock.calls[0][0].cookies).toHaveLength(2);
            expect(this.onSuccess.mock.calls[0][0].cookies[0].name).toBe('username');
            expect(this.onSuccess.mock.calls[0][0].cookies[0].value).toBe('yujiosaka');
            expect(this.onSuccess.mock.calls[0][0].cookies[1].name).toBe('sessionid');
            expect(this.onSuccess.mock.calls[0][0].cookies[1].value).toBe('4ec74265ba314bb0e47d4a615e9dd031');
          });
        });

        describe('when the page requires the basic authentication', () => {
          beforeEach(() => {
            this.server.setContent('/', 'Authorization succeeded!');
            this.server.setAuth('/', 'username', 'password');
          });

          test('fails authentication when username and password options are not set', async () => {
            // jest.setTimeout(60000);
            await this.crawler.queue({
              url: INDEX_PAGE,
              retryDelay: 500,
              retryCount: 1,
            });
            await this.crawler.onIdle();
            expect(this.onError).toHaveBeenCalledTimes(1);
            expect(this.onSuccess).toHaveBeenCalledTimes(0);
          });

          test('fails authentication when wrong username and password options are set', async () => {
            await this.crawler.queue({
              url: INDEX_PAGE,
              username: 'password',
              password: 'username',
              retryDelay: 500,
              retryCount: 1,
            });
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
            expect(this.onSuccess.mock.calls[0][0].result).toBe('HTTP Error 401 Unauthorized: Access is denied');
          });

          test('passes authentication when proper username and password options are set', async () => {
            await this.crawler.queue({
              url: INDEX_PAGE,
              username: 'username',
              password: 'password',
            });
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
            expect(this.onSuccess.mock.calls[0][0].result).toBe('Authorization succeeded!');
          });
        });

        describe('when the sitemap.xml is referred by the robots.txt', () => {
          beforeEach(() => {
            this.server.setContent('/robots.txt', `Sitemap: ${PREFIX}/sitemap.xml`);
            this.server.setContent('/sitemap.xml', `
            <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
              <url>
                <loc>${PREFIX}/2.html</loc>
                <priority>1.0</priority>
              </url>
            </urlset>
            `);
          });

          test('does not follow the sitemap.xml', async () => {
            await this.crawler.queue(`${PREFIX}/1.html`);
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
          });

          test('DOES NOT FOLLOW (Not Implemented) the sitemap.xml with followSitemapXml = true', async () => {
            await this.crawler.queue({ url: `${PREFIX}/1.html`, followSitemapXml: true });
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
          });
        });
      });

      describe('when the crawler is launched with the device option', () => {
        beforeEach(async () => {
          this.server.setContent('/', '<script>window.document.write(window.navigator.userAgent);</script>');
          this.crawler = await HCCrawler.launch(extend({
            evaluatePage,
            onSuccess: this.onSuccess,
            device: 'iPhone 6',
          }, DEFAULT_OPTIONS));
        });

        test('modifies the userAgent', async () => {
          await this.crawler.queue(INDEX_PAGE);
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
          expect(this.onSuccess.mock.calls[0][0].result).toContain('iPhone');
        });

        test("overrides the device with device = 'Nexus 6'", async () => {
          await this.crawler.queue({ url: INDEX_PAGE, device: 'Nexus 6' });
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
          expect(this.onSuccess.mock.calls[0][0].result).toContain('Nexus 6');
        });

        test("overrides the user agent with userAgent = 'headless-chrome-crawler'", async () => {
          await this.crawler.queue({ url: INDEX_PAGE, userAgent: 'headless-chrome-crawler' });
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
          expect(this.onSuccess.mock.calls[0][0].result).toBe('headless-chrome-crawler');
        });
      });

      describe('when the crawler is launched with retryCount = 0', () => {
        beforeEach(async () => {
          this.crawler = await HCCrawler.launch(extend({
            evaluatePage,
            onSuccess: this.onSuccess,
            onError: this.onError,
            retryCount: 0,
          }, DEFAULT_OPTIONS));
        });

        test('succeeds evaluating page', async () => {
          await this.crawler.queue(INDEX_PAGE);
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
          expect(this.onSuccess.mock.calls[0][0].result).toBe('/');
        });

        test('fails evaluating page with jQuery = false', async () => {
          await this.crawler.queue({ url: INDEX_PAGE, jQuery: false });
          await this.crawler.onIdle();
          expect(this.onError).toHaveBeenCalledTimes(1);
          expect(this.onError.mock.calls[0][0].options.url).toBe(INDEX_PAGE);
          expect(this.onError.mock.calls[0][0].depth).toBe(1);
          expect(this.onError.mock.calls[0][0].previousUrl).toBe(null);
          expect(this.onError.mock.calls[0][0].message).toContain('Evaluation failed:');
        });

        describe('when the page is protected by CSP meta tag', () => {
          beforeEach(() => {
            this.server.setContent('/csp.html', `
            <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
            <h1>Welcome to ${PREFIX}/csp.html</h1>
            `);
          });

          it('succeeds evaluating page', async () => {
            await this.crawler.queue(`${PREFIX}/csp.html`);
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
            expect(this.onSuccess.mock.calls[0][0].result).toContain('Welcome to');
          });
        });

        describe('when the page is protected by CSP header', () => {
          beforeEach(() => {
            this.server.setCSP('/empty.html', 'default-src "self"');
          });

          it('succeeds evaluating page', async () => {
            await this.crawler.queue(`${INDEX_PAGE}`);
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
            expect(this.onSuccess.mock.calls[0][0].result).toBe('/');
          });
        });

        describe('when the page response is delayed', () => {
          beforeEach(() => {
            this.server.setResponseDelay('/', 200);
          });

          it('succeeds request when the timeout option is not set', async () => {
            await this.crawler.queue(INDEX_PAGE);
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
          });

          test('succeeds request when the timeout option is disabled', async () => {
            await this.crawler.queue({ url: INDEX_PAGE, timeout: 0 });
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
          });

          test('succeeds request when the timeout option is longer than the response delay', async () => {
            await this.crawler.queue({ url: INDEX_PAGE, timeout: 400 });
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
          });

          test('fails request when the timeout option is shorter than the response delay', async () => {
            await this.crawler.queue({ url: INDEX_PAGE, timeout: 100 });
            await this.crawler.onIdle();
            expect(this.onError).toHaveBeenCalledTimes(1);
            expect(this.onError.mock.calls[0][0].options.url).toBe(INDEX_PAGE);
            expect(this.onError.mock.calls[0][0].depth).toBe(1);
            expect(this.onError.mock.calls[0][0].previousUrl).toBe(null);
            expect(this.onError.mock.calls[0][0].message).toContain('Navigation timeout of 100 ms exceeded');
          });
        });

        describe('when an image is responded after the timeout option', () => {
          beforeEach(() => {
            this.server.setContent('/', `<body><div style="background-image: url('${PREFIX}/empty.png');"></body>`);
            this.server.setContent('/empty.png', '');
            this.server.setResponseDelay('/empty.png', 400);
          });

          test('fails request when the waitUntil option is not set', async () => {
            await this.crawler.queue({ url: INDEX_PAGE, timeout: 200 });
            await this.crawler.onIdle();
            expect(this.onError).toHaveBeenCalledTimes(1);
            expect(this.onError.mock.calls[0][0].options.url).toBe(INDEX_PAGE);
            expect(this.onError.mock.calls[0][0].depth).toBe(1);
            expect(this.onError.mock.calls[0][0].previousUrl).toBe(null);
            expect(this.onError.mock.calls[0][0].message).toContain('Navigation timeout of 200 ms exceeded');
          });

          test("fails request with waitUntil = 'load'", async () => {
            await this.crawler.queue({ url: INDEX_PAGE, timeout: 200, waitUntil: 'load' });
            await this.crawler.onIdle();
            expect(this.onError).toHaveBeenCalledTimes(1);
            expect(this.onError.mock.calls[0][0].options.url).toBe(INDEX_PAGE);
            expect(this.onError.mock.calls[0][0].depth).toBe(1);
            expect(this.onError.mock.calls[0][0].previousUrl).toBe(null);
            expect(this.onError.mock.calls[0][0].message).toContain('Navigation timeout of 200 ms exceeded');
          });

          test("succeeds request with waitUntil = 'domcontentloaded'", async () => {
            await this.crawler.queue({ url: INDEX_PAGE, timeout: 200, waitUntil: 'domcontentloaded' });
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
          });

          test("succeeds request with waitUntil = ['domcontentloaded']", async () => {
            await this.crawler.queue({ url: INDEX_PAGE, timeout: 200, waitUntil: ['domcontentloaded'] });
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
          });

          test("fails request with waitUntil = ['load', 'domcontentloaded']", async () => {
            await this.crawler.queue({ url: INDEX_PAGE, timeout: 200, waitUntil: ['load', 'domcontentloaded'] });
            await this.crawler.onIdle();
            expect(this.onError).toHaveBeenCalledTimes(1);
            expect(this.onError.mock.calls[0][0].options.url).toBe(INDEX_PAGE);
            expect(this.onError.mock.calls[0][0].depth).toBe(1);
            expect(this.onError.mock.calls[0][0].previousUrl).toBe(null);
            expect(this.onError.mock.calls[0][0].message).toContain('Navigation timeout of 200 ms exceeded');
          });
        });
      });

      describe('when the crawler is launched with maxConcurrency = 1', () => {
        beforeEach(async () => {
          this.crawler = await HCCrawler.launch(extend({
            onSuccess: this.onSuccess,
            maxConcurrency: 1,
          }, DEFAULT_OPTIONS));
        });

        test('does not throw an error when the delay option is set', async () => {
          await this.crawler.queue({ url: INDEX_PAGE, delay: 100 });
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
        });

        test('does not crawl already cached urls', async () => {
          await this.crawler.queue(`${PREFIX}/1.html`);
          await this.crawler.queue(`${PREFIX}/2.html`);
          await this.crawler.queue(`${PREFIX}/1.html`); // The queue won't be requested
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(2);
        });

        test('does not crawl twice if one url has a trailing slash on the root folder and the other does not', async () => {
          await this.crawler.queue(`${PREFIX}`);
          await this.crawler.queue(`${PREFIX}/`);
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(1);
        });

        test('obeys the priority order', async () => {
          await Promise.all([
            this.crawler.queue({ url: `${PREFIX}/1.html`, priority: 1 }),
            this.crawler.queue({ url: `${PREFIX}/2.html`, priority: 2 }),
          ]);
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(2);
          expect(this.onSuccess.mock.calls[0][0].options.url).toBe(`${PREFIX}/2.html`);
          expect(this.onSuccess.mock.calls[1][0].options.url).toBe(`${PREFIX}/1.html`);
        });

        test('crawls duplicate urls with skipDuplicates = false', async () => {
          await this.crawler.queue({ url: `${PREFIX}/1.html` });
          await this.crawler.queue({ url: `${PREFIX}/2.html` });
          await this.crawler.queue({ url: `${PREFIX}/1.html` });
          await this.crawler.queue({ url: `${PREFIX}/2.html`, skipDuplicates: false }); // The queue will be requested
          await this.crawler.onIdle();
          expect(this.onSuccess).toHaveBeenCalledTimes(3);
        });

        describe('when the first page contains several links', () => {
          beforeEach(() => {
            this.server.setContent('/1.html', `
            go to <a href="${PREFIX}/2.html">/2.html</a>
            go to <a href="${PREFIX}/3.html">/3.html</a>
            `);
            this.server.setContent('/2.html', `go to <a href="${PREFIX}/4.html">/4.html</a>`);
          });

          test('follow links with depth first order (DFS) with maxDepth = 3', async () => {
            await this.crawler.queue({ url: `${PREFIX}/1.html`, maxDepth: 3 });
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(4);
            expect(this.onSuccess.mock.calls[0][0].depth).toBe(1);
            expect(this.onSuccess.mock.calls[0][0].previousUrl).toBe(null);
            expect(this.onSuccess.mock.calls[1][0].depth).toBe(2);
            expect(this.onSuccess.mock.calls[1][0].previousUrl).toBe(`${PREFIX}/1.html`);
            expect(this.onSuccess.mock.calls[2][0].depth).toBe(3);
            expect(this.onSuccess.mock.calls[2][0].previousUrl).toBe(`${PREFIX}/2.html`);
          });

          test('follow links with breadth first order (BFS) with maxDepth = 3 and depthPriority = false', async () => {
            await this.crawler.queue({ url: `${PREFIX}/1.html`, maxDepth: 3, depthPriority: false });
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(4);
            expect(this.onSuccess.mock.calls[0][0].depth).toBe(1);
            expect(this.onSuccess.mock.calls[0][0].previousUrl).toBe(null);
            expect(this.onSuccess.mock.calls[1][0].depth).toBe(2);
            expect(this.onSuccess.mock.calls[1][0].previousUrl).toBe(`${PREFIX}/1.html`);
            expect(this.onSuccess.mock.calls[2][0].depth).toBe(2);
            expect(this.onSuccess.mock.calls[2][0].previousUrl).toBe(`${PREFIX}/1.html`);
          });
        });
      });

      describe('when the crawler is launched with the maxRequest option', () => {
        beforeEach(async () => {
          this.crawler = await HCCrawler.launch(extend({
            onSuccess: this.onSuccess,
            maxConcurrency: 1,
            maxRequest: 2,
          }, DEFAULT_OPTIONS));
        });

        test('pauses at the maxRequest option', async () => {
          let maxrequestreached = 0;
          this.crawler.on('maxrequestreached', () => { maxrequestreached += 1; });
          await this.crawler.queue(`${PREFIX}/1.html`);
          await this.crawler.queue(`${PREFIX}/2.html`);
          await this.crawler.queue(`${PREFIX}/3.html`);
          await this.crawler.onIdle();
          expect(maxrequestreached).toBe(1);
          expect(this.crawler.isPaused()).toBe(true);
          expect(this.onSuccess).toHaveBeenCalledTimes(2);
          const size = await this.crawler.queueSize();
          expect(size).toBe(1);
        });

        test('resumes from the maxRequest option', async () => {
          await this.crawler.queue(`${PREFIX}/1.html`);
          await this.crawler.queue(`${PREFIX}/2.html`);
          await this.crawler.queue(`${PREFIX}/3.html`);
          await this.crawler.onIdle();
          expect(this.crawler.isPaused()).toBe(true);
          expect(this.onSuccess).toHaveBeenCalledTimes(2);
          const size1 = await this.crawler.queueSize();
          expect(size1).toBe(1);
          this.crawler.setMaxRequest(4);
          this.crawler.resume();
          await this.crawler.onIdle();
          expect(this.crawler.isPaused()).toBe(false);
          expect(this.onSuccess).toHaveBeenCalledTimes(3);
          const size2 = await this.crawler.queueSize();
          expect(size2).toBe(0);
        });
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

      describe('when the crawler is launched with the customCrawl function', () => {
        describe('when the customCrawl sets page content to the result', () => {
          async function customCrawl(page, crawl) {
            const result = await crawl();
            result.content = await page.content();
            return result;
          }

          beforeEach(async () => {
            this.crawler = await HCCrawler.launch(extend({
              onSuccess: this.onSuccess,
              customCrawl,
            }, DEFAULT_OPTIONS));
          });

          test('resolves the page content', async () => {
            const content = `<h1>Welcome to ${INDEX_PAGE}</h1>`;
            this.server.setContent('/', content);
            await this.crawler.queue(INDEX_PAGE);
            await this.crawler.onIdle();
            expect(this.onSuccess).toHaveBeenCalledTimes(1);
            expect(this.onSuccess.mock.calls[0][0].content).toContain(content);
          });
        });
      });

      describe('when the crawler is launched with the exporter option', () => {
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

        describe('when the crawler is launched with exporter = CSVExporter', () => {
          beforeEach(async () => {
            await removeTemporaryFile(CSV_FILE);
            const exporter = new CSVExporter({
              file: CSV_FILE,
              fields: ['result'],
            });
            this.crawler = await HCCrawler.launch(extend({
              evaluatePage,
              onSuccess: this.onSuccess,
              exporter,
              maxConcurrency: 1,
            }, DEFAULT_OPTIONS));
          });

          test('exports a CSV file', async () => {
            await this.crawler.queue(`${PREFIX}/1.html`);
            await this.crawler.queue(`${PREFIX}/2.html`);
            await this.crawler.onIdle();
            const actual = await readTemporaryFile(CSV_FILE);
            const header = 'result\n';
            const line1 = '/1.html\n';
            const line2 = '/2.html\n';
            const expected = header + line1 + line2;
            expect(actual).toBe(expected);
            expect(this.onSuccess).toHaveBeenCalledTimes(2);
          });
        });

        describe('when the crawler is launched with exporter = JSONLineExporter', () => {
          beforeEach(async () => {
            await removeTemporaryFile(JSON_FILE);
            const exporter = new JSONLineExporter({
              file: JSON_FILE,
              fields: ['result'],
            });
            this.crawler = await HCCrawler.launch(extend({
              evaluatePage,
              onSuccess: this.onSuccess,
              exporter,
              maxConcurrency: 1,
            }, DEFAULT_OPTIONS));
          });

          it('exports a json-line file', async () => {
            await this.crawler.queue(`${PREFIX}/1.html`);
            await this.crawler.queue(`${PREFIX}/2.html`);
            await this.crawler.onIdle();
            const actual = await readTemporaryFile(JSON_FILE);
            const line1 = `${JSON.stringify({ result: '/1.html' })}\n`;
            const line2 = `${JSON.stringify({ result: '/2.html' })}\n`;
            const expected = line1 + line2;
            expect(actual).toBe(expected);
            expect(this.onSuccess).toHaveBeenCalledTimes(2);
          });
        });
      });
    });

    describe('when the this.server is not running', () => {
      beforeEach(async () => {
        this.crawler = await HCCrawler.launch(extend({
          headless: 'new',
          onError: this.onError,
        }, DEFAULT_OPTIONS));
      });

      test('retries and gives up', async () => {
        let requestretried = 0;
        let requestfailed = 0;
        this.crawler.on('requestretried', () => { requestretried += 1; });
        this.crawler.on('requestfailed', () => { requestfailed += 1; });
        await this.crawler.queue({ url: INDEX_PAGE, retryCount: 3, retryDelay: 100 });
        await this.crawler.onIdle();
        expect(requestretried).toBe(3);
        expect(requestfailed).toBe(1);
        expect(this.crawler.pendingQueueSize()).toBe(0);
        expect(this.crawler.requestedCount()).toBe(1);
        expect(this.onError).toHaveBeenCalledTimes(1);
        expect(this.onError.mock.calls[0][0].options.url).toBe(INDEX_PAGE);
        expect(this.onError.mock.calls[0][0].depth).toBe(1);
        expect(this.onError.mock.calls[0][0].previousUrl).toBe(null);
        expect(this.onError.mock.calls[0][0].message).toContain('net::ERR_CONNECTION_REFUSED');
      });
    });
  });
});
