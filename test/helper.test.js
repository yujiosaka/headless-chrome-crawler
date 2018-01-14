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
  getSitemapUrls,
  unescape,
  stringifyArgument,
  debugConsole,
  debugDialog,
} = require('../lib/helper');

describe('Helper', () => {
  describe('Helper.delay', () => {
    it('should wait until shorter delay', () => {
      let waited = false;
      delay(50).then(() => {
        waited = true;
      });
      return delay(100).then(() => {
        assert.equal(waited, true);
      });
    });

    it('should not wait until longer delay', () => {
      let waited = false;
      delay(100).then(() => {
        waited = true;
      });
      return delay(50).then(() => {
        assert.equal(waited, false);
      });
    });
  });

  describe('Helper.hash', () => {
    it('returns the same results for same sources', () => {
      const src = '{"url":"http://example.com/"}';
      const result1 = hash(src);
      const result2 = hash(src);
      assert.equal(result1, result2);
    });
  });

  describe('Helper.generateKey', () => {
    it('returns the same results for same objects with different orders', () => {
      const key1 = generateKey({ a: 3, b: [{ x: 4, y: 5, z: 6 }, 7], c: 8 });
      const key2 = generateKey({ c: 8, b: [{ z: 6, y: 5, x: 4 }, 7], a: 3 });
      assert.equal(key1, key2);
    });
  });

  describe('Helper.jsonStableReplacer', () => {
    it('sorts keys by order', () => {
      const obj = { c: 8, b: [{ z: 6, y: 5, x: 4 }, 7], a: 3 };
      const actual = JSON.stringify(obj, jsonStableReplacer);
      const expected = '{"a":3,"b":[{"x":4,"y":5,"z":6},7],"c":8}';
      assert.equal(actual, expected);
    });
  });

  describe('Helper.resolveUrl', () => {
    const baseUrl = 'https://github.com/yujiosaka/headless-chrome-crawler';

    it('returns null when the argument is null', () => {
      const actual = resolveUrl(null, baseUrl);
      const expected = null;
      assert.equal(actual, expected);
    });

    it('returns null when the argument starts With hash', () => {
      const actual = resolveUrl('#headless-chrome-crawler---', baseUrl);
      const expected = null;
      assert.equal(actual, expected);
    });

    it('returns null when the argument starts with javascript:', () => {
      const actual = resolveUrl('javascript:void(0)', baseUrl); /* eslint no-script-url: 0 */
      const expected = null;
      assert.equal(actual, expected);
    });

    it('returns null when the argument starts with mailto:', () => {
      const actual = resolveUrl('mail:yujiosaka@example.com', baseUrl);
      const expected = null;
      assert.equal(actual, expected);
    });

    it('returns full URL when the argument is an absolute URL', () => {
      const actual = resolveUrl('https://github.com/yujiosaka/headless-chrome-crawler', baseUrl);
      const expected = 'https://github.com/yujiosaka/headless-chrome-crawler';
      assert.equal(actual, expected);
    });

    it('strips hash when the argument is an absolute URL with hash', () => {
      const actual = resolveUrl('https://github.com/yujiosaka/headless-chrome-crawler#headless-chrome-crawler---', baseUrl);
      const expected = 'https://github.com/yujiosaka/headless-chrome-crawler';
      assert.equal(actual, expected);
    });

    it('resolves url when the argument is a relative URL', () => {
      const actual = resolveUrl('headless-chrome-crawler/settings', baseUrl);
      const expected = 'https://github.com/yujiosaka/headless-chrome-crawler/settings';
      assert.equal(actual, expected);
    });
  });

  describe('Helper.escapeQuotes', () => {
    context('when separator option is not set', () => {
      it('does not escape value when no quote, comma or break is found', () => {
        const actual = escapeQuotes('yujiosaka/headless-chrome-crawler');
        const expected = 'yujiosaka/headless-chrome-crawler';
        assert.equal(actual, expected);
      });

      it('escapes value when commas are found', () => {
        const actual = escapeQuotes('Headless Chrome crawls with jQuery support, powered by Puppeteer');
        const expected = '"Headless Chrome crawls with jQuery support, powered by Puppeteer"';
        assert.equal(actual, expected);
      });

      it('escapes value when quotes are found', () => {
        const actual = escapeQuotes('# or "npm i headless-chrome-crawler"');
        const expected = '"# or ""npm i headless-chrome-crawler"""';
        assert.equal(actual, expected);
      });

      it('escapes value when breaks are found', () => {
        const actual = escapeQuotes('yujiosaka\nheadless-chrome-crawler');
        const expected = '"yujiosaka\nheadless-chrome-crawler"';
        assert.equal(actual, expected);
      });
    });

    context('when separator is a tab', () => {
      it('does not escape value when no quote, tab or break is found', () => {
        const actual = escapeQuotes('Headless Chrome crawls with jQuery support, powered by Puppeteer', '\t');
        const expected = 'Headless Chrome crawls with jQuery support, powered by Puppeteer';
        assert.equal(actual, expected);
      });

      it('escapes value when tabs are found', () => {
        const actual = escapeQuotes('Headless Chrome crawls with jQuery support\tpowered by Puppeteer', '\t');
        const expected = '"Headless Chrome crawls with jQuery support\tpowered by Puppeteer"';
        assert.equal(actual, expected);
      });
    });
  });

  describe('Helper.getRobotsUrl', () => {
    it('locates robots.txt for standard http URL', () => {
      const actual = getRobotsUrl('http://example.com/');
      const expected = 'http://example.com/robots.txt';
      assert.equal(actual, expected);
    });

    it('locates robots.txt for standard https URL', () => {
      const actual = getRobotsUrl('https://example.com/');
      const expected = 'https://example.com/robots.txt';
      assert.equal(actual, expected);
    });

    it('locates robots.txt for non-standard http URL', () => {
      const actual = getRobotsUrl('https://example.com:8080/');
      const expected = 'https://example.com:8080/robots.txt';
      assert.equal(actual, expected);
    });

    it('locates robots.txt for non-standard https URL', () => {
      const actual = getRobotsUrl('https://example.com:8432/');
      const expected = 'https://example.com:8432/robots.txt';
      assert.equal(actual, expected);
    });
  });

  describe('Helper.lowerBound', () => {
    it('returns the first index for positive values', () => {
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

    it('returns the first index for negative values', () => {
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

    it('returns the first index for mixed values', () => {
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
  });

  describe('Helper.getSitemapUrls', () => {
    it('returns empty array for empty xml', () => {
      const actual = getSitemapUrls('');
      const expected = [];
      assert.deepEqual(actual, expected);
    });

    it('returns empty array for no urls', () => {
      const actual = getSitemapUrls(`
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      </urlset>
      `);
      const expected = [];
      assert.deepEqual(actual, expected);
    });

    it('returns a url', () => {
      const actual = getSitemapUrls(`
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://github.com/yujiosaka/headless-chrome-crawler/issues</loc></url>
      </urlset>
      `);
      const expected = ['https://github.com/yujiosaka/headless-chrome-crawler/issues'];
      assert.deepEqual(actual, expected);
    });
  });

  describe('Helper.unescape', () => {
    it('returns empty string for empty argument', () => {
      const actual = unescape('');
      const expected = '';
      assert.equal(actual, expected);
    });

    it('returns the same string for non-escaped argument', () => {
      const actual = unescape('https://github.com/yujiosaka/headless-chrome-crawler/issues');
      const expected = 'https://github.com/yujiosaka/headless-chrome-crawler/issues';
      assert.equal(actual, expected);
    });

    it('returns the unescaped argument', () => {
      const actual = unescape('&lt;loc&gt;https://github.com/yujiosaka/headless-chrome-crawler/issues?a=1&amp;b=2&lt;/loc&gt;');
      const expected = '<loc>https://github.com/yujiosaka/headless-chrome-crawler/issues?a=1&b=2</loc>';
      assert.equal(actual, expected);
    });
  });

  describe('Helper.stringifyArgument', () => {
    it('stringifies undefined', () => {
      const actual = stringifyArgument(undefined);
      const expected = 'undefined';
      assert.equal(actual, expected);
    });

    it('stringifies null', () => {
      const actual = stringifyArgument(null);
      const expected = 'null';
      assert.equal(actual, expected);
    });

    it('stringifies boolean', () => {
      const actual = stringifyArgument(false);
      const expected = 'false';
      assert.equal(actual, expected);
    });

    it('stringifies string', () => {
      const actual = stringifyArgument('https://github.com/yujiosaka/headless-chrome-crawler');
      const expected = "'https://github.com/yujiosaka/headless-chrome-crawler'";
      assert.equal(actual, expected);
    });

    it('stringifies number', () => {
      const actual = stringifyArgument(3);
      const expected = '3';
      assert.equal(actual, expected);
    });

    it('stringifies function', () => {
      const actual = stringifyArgument(noop);
      const expected = '[Function: noop]';
      assert.equal(actual, expected);
    });

    it('stringifies object', () => {
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

  describe('Helper.debugConsole', () => {
    it('does not throw an error', () => {
      assert.doesNotThrow(() => {
        debugConsole('log init at https://github.com/yujiosaka/headless-chrome-crawler');
      });
    });
  });

  describe('Helper.debugDialog', () => {
    it('does not throw an error', () => {
      assert.doesNotThrow(() => {
        debugDialog('beforeUnload This page is asking you to confirm that you want to leave - data you have entered may not be saved. at https://github.com/yujiosaka/headless-chrome-crawler');
      });
    });
  });
});
