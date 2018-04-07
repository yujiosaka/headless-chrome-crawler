const assert = require('assert');
const { noop } = require('lodash');
const {
  delay,
  jsonStableReplacer,
  hash,
  generateKey,
  resolveUrl,
  escapeQuotes,
  getRobotsUrl,
  lowerBound,
  checkDomainMatch,
  getSitemapUrls,
  unescape,
  stringifyArgument,
  debugConsole,
  debugDialog,
} = require('../lib/helper');

describe('Helper', function () {
  describe('Helper.delay', function () {
    it('should wait until shorter delay', async function () {
      let waited = false;
      delay(50).then(function () { waited = true; });
      await delay(100);
      assert.equal(waited, true);
    });

    it('should not wait until longer delay', async function () {
      let waited = false;
      delay(100).then(function () { waited = true; });
      await delay(50);
      assert.equal(waited, false);
    });
  });

  describe('Helper.hash', function () {
    it('returns the same results for same sources', function () {
      const src = '{"url":"http://example.com/"}';
      const result1 = hash(src);
      const result2 = hash(src);
      assert.equal(result1, result2);
    });
  });

  describe('Helper.generateKey', function () {
    it('returns the same results for same objects with different orders', function () {
      const key1 = generateKey({ a: 3, b: [{ x: 4, y: 5, z: 6 }, 7], c: 8 });
      const key2 = generateKey({ c: 8, b: [{ z: 6, y: 5, x: 4 }, 7], a: 3 });
      assert.equal(key1, key2);
    });
  });

  describe('Helper.jsonStableReplacer', function () {
    it('sorts keys by order', function () {
      const obj = { c: 8, b: [{ z: 6, y: 5, x: 4 }, 7], a: 3 };
      const actual = JSON.stringify(obj, jsonStableReplacer);
      const expected = '{"a":3,"b":[{"x":4,"y":5,"z":6},7],"c":8}';
      assert.equal(actual, expected);
    });
  });

  describe('Helper.resolveUrl', function () {
    const baseUrl = 'https://github.com/yujiosaka/headless-chrome-crawler';

    it('returns null when the argument is null', function () {
      const actual = resolveUrl(null, baseUrl);
      const expected = null;
      assert.equal(actual, expected);
    });

    it('returns null when the argument starts With hash', function () {
      const actual = resolveUrl('#headless-chrome-crawler---', baseUrl);
      const expected = null;
      assert.equal(actual, expected);
    });

    it('returns null when the argument starts with javascript:', function () {
      const actual = resolveUrl('javascript:void(0)', baseUrl); /* eslint no-script-url: 0 */
      const expected = null;
      assert.equal(actual, expected);
    });

    it('returns null when the argument starts with mailto:', function () {
      const actual = resolveUrl('mail:yujiosaka@example.com', baseUrl);
      const expected = null;
      assert.equal(actual, expected);
    });

    it('returns full URL when the argument is an absolute URL', function () {
      const actual = resolveUrl('https://github.com/yujiosaka/headless-chrome-crawler', baseUrl);
      const expected = 'https://github.com/yujiosaka/headless-chrome-crawler';
      assert.equal(actual, expected);
    });

    it('strips hash when the argument is an absolute URL with hash', function () {
      const actual = resolveUrl('https://github.com/yujiosaka/headless-chrome-crawler#headless-chrome-crawler---', baseUrl);
      const expected = 'https://github.com/yujiosaka/headless-chrome-crawler';
      assert.equal(actual, expected);
    });

    it('resolves url when the argument is a relative URL', function () {
      const actual = resolveUrl('headless-chrome-crawler/settings', baseUrl);
      const expected = 'https://github.com/yujiosaka/headless-chrome-crawler/settings';
      assert.equal(actual, expected);
    });
  });

  describe('Helper.escapeQuotes', function () {
    context('when separator option is not set', function () {
      it('does not escape value when no quote, comma or break is found', function () {
        const actual = escapeQuotes('yujiosaka/headless-chrome-crawler');
        const expected = 'yujiosaka/headless-chrome-crawler';
        assert.equal(actual, expected);
      });

      it('escapes value when commas are found', function () {
        const actual = escapeQuotes('Headless Chrome crawls with jQuery support, powered by Puppeteer');
        const expected = '"Headless Chrome crawls with jQuery support, powered by Puppeteer"';
        assert.equal(actual, expected);
      });

      it('escapes value when quotes are found', function () {
        const actual = escapeQuotes('# or "npm i headless-chrome-crawler"');
        const expected = '"# or ""npm i headless-chrome-crawler"""';
        assert.equal(actual, expected);
      });

      it('escapes value when breaks are found', function () {
        const actual = escapeQuotes('yujiosaka\nheadless-chrome-crawler');
        const expected = '"yujiosaka\nheadless-chrome-crawler"';
        assert.equal(actual, expected);
      });
    });

    context('when separator is a tab', function () {
      it('does not escape value when no quote, tab or break is found', function () {
        const actual = escapeQuotes('Headless Chrome crawls with jQuery support, powered by Puppeteer', '\t');
        const expected = 'Headless Chrome crawls with jQuery support, powered by Puppeteer';
        assert.equal(actual, expected);
      });

      it('escapes value when tabs are found', function () {
        const actual = escapeQuotes('Headless Chrome crawls with jQuery support\tpowered by Puppeteer', '\t');
        const expected = '"Headless Chrome crawls with jQuery support\tpowered by Puppeteer"';
        assert.equal(actual, expected);
      });
    });
  });

  describe('Helper.getRobotsUrl', function () {
    it('locates robots.txt for standard http URL', function () {
      const actual = getRobotsUrl('http://example.com/');
      const expected = 'http://example.com/robots.txt';
      assert.equal(actual, expected);
    });

    it('locates robots.txt for standard https URL', function () {
      const actual = getRobotsUrl('https://example.com/');
      const expected = 'https://example.com/robots.txt';
      assert.equal(actual, expected);
    });

    it('locates robots.txt for non-standard http URL', function () {
      const actual = getRobotsUrl('https://example.com:8080/');
      const expected = 'https://example.com:8080/robots.txt';
      assert.equal(actual, expected);
    });

    it('locates robots.txt for non-standard https URL', function () {
      const actual = getRobotsUrl('https://example.com:8432/');
      const expected = 'https://example.com:8432/robots.txt';
      assert.equal(actual, expected);
    });
  });

  describe('Helper.lowerBound', function () {
    it('returns the first index for positive values', function () {
      const queue = [
        { priority: 4 },
        { priority: 3 },
        { priority: 1 },
      ];
      const item = { priority: 2 };
      const actual = lowerBound(queue, item, (a, b) => b.priority - a.priority);
      const expected = 2;
      assert.equal(actual, expected);
    });

    it('returns the first index for negative values', function () {
      const queue = [
        { priority: -1 },
        { priority: -2 },
        { priority: -4 },
      ];
      const item = { priority: -3 };
      const actual = lowerBound(queue, item, (a, b) => b.priority - a.priority);
      const expected = 2;
      assert.equal(actual, expected);
    });

    it('returns the first index for mixed values', function () {
      const queue = [
        { priority: 1 },
        { priority: 0 },
        { priority: -2 },
      ];
      const item = { priority: -1 };
      const actual = lowerBound(queue, item, (a, b) => b.priority - a.priority);
      const expected = 2;
      assert.equal(actual, expected);
    });

    it('returns the first index when queue is long', function () {
      const queue = [
        { priority: 4 },
        { priority: 3 },
        { priority: 1 },
        { priority: 0 },
        { priority: -1 },
        { priority: -2 },
        { priority: -4 },
      ];
      const item = { priority: -5 };
      const actual = lowerBound(queue, item, (a, b) => b.priority - a.priority);
      const expected = 7;
      assert.equal(actual, expected);
    });
  });

  describe('Helper.checkDomainMatch', function () {
    it('returns false for empty array', function () {
      const actual = checkDomainMatch([], '127.0.0.1');
      const expected = false;
      assert.equal(actual, expected);
    });

    it('returns false when no domain fully matches requested hostname', function () {
      const actual = checkDomainMatch(['localhost', '0.0.0.0'], '127.0.0.1');
      const expected = false;
      assert.equal(actual, expected);
    });

    it('returns false when no domain matches requested hostname by regular expression', function () {
      const actual = checkDomainMatch([/^localhost$/, /^\d\.\d\.\d\.\d$/], '127.0.0.1');
      const expected = false;
      assert.equal(actual, expected);
    });

    it('returns true when a domain fully matches requested hostname', function () {
      const actual = checkDomainMatch(['localhost', '127.0.0.1'], '127.0.0.1');
      const expected = true;
      assert.equal(actual, expected);
    });

    it('returns true when a domain fully matches requested hostname by regular expression', function () {
      const actual = checkDomainMatch([/^localhost$/, /^\d+\.\d+\.\d+\.\d+$/], '127.0.0.1');
      const expected = true;
      assert.equal(actual, expected);
    });
  });

  describe('Helper.getSitemapUrls', function () {
    it('returns empty array for empty xml', function () {
      const actual = getSitemapUrls('');
      const expected = [];
      assert.deepEqual(actual, expected);
    });

    it('returns empty array for no urls', function () {
      const actual = getSitemapUrls(`
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      </urlset>
      `);
      const expected = [];
      assert.deepEqual(actual, expected);
    });

    it('returns a url', function () {
      const actual = getSitemapUrls(`
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://github.com/yujiosaka/headless-chrome-crawler/issues</loc></url>
      </urlset>
      `);
      const expected = ['https://github.com/yujiosaka/headless-chrome-crawler/issues'];
      assert.deepEqual(actual, expected);
    });
  });

  describe('Helper.unescape', function () {
    it('returns empty string for empty argument', function () {
      const actual = unescape('');
      const expected = '';
      assert.equal(actual, expected);
    });

    it('returns the same string for non-escaped argument', function () {
      const actual = unescape('https://github.com/yujiosaka/headless-chrome-crawler/issues');
      const expected = 'https://github.com/yujiosaka/headless-chrome-crawler/issues';
      assert.equal(actual, expected);
    });

    it('returns the unescaped argument', function () {
      const actual = unescape('&lt;loc&gt;https://github.com/yujiosaka/headless-chrome-crawler/issues?a=1&amp;b=2&lt;/loc&gt;');
      const expected = '<loc>https://github.com/yujiosaka/headless-chrome-crawler/issues?a=1&b=2</loc>';
      assert.equal(actual, expected);
    });
  });

  describe('Helper.stringifyArgument', function () {
    it('stringifies undefined', function () {
      const actual = stringifyArgument(undefined);
      const expected = 'undefined';
      assert.equal(actual, expected);
    });

    it('stringifies null', function () {
      const actual = stringifyArgument(null);
      const expected = 'null';
      assert.equal(actual, expected);
    });

    it('stringifies boolean', function () {
      const actual = stringifyArgument(false);
      const expected = 'false';
      assert.equal(actual, expected);
    });

    it('stringifies string', function () {
      const actual = stringifyArgument('https://github.com/yujiosaka/headless-chrome-crawler');
      const expected = "'https://github.com/yujiosaka/headless-chrome-crawler'";
      assert.equal(actual, expected);
    });

    it('stringifies number', function () {
      const actual = stringifyArgument(3);
      const expected = '3';
      assert.equal(actual, expected);
    });

    it('stringifies function', function () {
      const actual = stringifyArgument(noop);
      const expected = '[Function: noop]';
      assert.equal(actual, expected);
    });

    it('stringifies object', function () {
      const actual = stringifyArgument({
        jQuery: false,
        url: 'https://github.com/yujiosaka/headless-chrome-crawler',
        retryCount: 3,
        evaluatePage: noop,
        cache: null,
      });
      const expected = "{ jQuery: false, url: 'https://github.com/yujiosaka/headless-chrome-crawler', retryCount: 3, evaluatePage: [Function: noop], cache: null }";
      assert.equal(actual, expected);
    });
  });

  describe('Helper.debugConsole', function () {
    it('does not throw an error', function () {
      assert.doesNotThrow(function () {
        debugConsole('log init at https://github.com/yujiosaka/headless-chrome-crawler');
      });
    });
  });

  describe('Helper.debugDialog', function () {
    it('does not throw an error', function () {
      assert.doesNotThrow(function () {
        debugDialog('beforeUnload This page is asking you to confirm that you want to leave - data you have entered may not be saved. at https://github.com/yujiosaka/headless-chrome-crawler');
      });
    });
  });
});
