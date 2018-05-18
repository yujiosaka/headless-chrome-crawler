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

describe('Helper', () => {
  describe('Helper.delay', () => {
    test('should wait until shorter delay', async () => {
      let waited = false;
      delay(50).then(() => { waited = true; });
      await delay(100);
      expect(waited).toBe(true);
    });

    test('should not wait until longer delay', async () => {
      let waited = false;
      delay(100).then(() => { waited = true; });
      await delay(50);
      expect(waited).toBe(false);
    });
  });

  describe('Helper.hash', () => {
    test('returns the same results for same sources', () => {
      const src = '{"url":"http://example.com/"}';
      const result1 = hash(src);
      const result2 = hash(src);
      expect(result1).toBe(result2);
    });
  });

  describe('Helper.generateKey', () => {
    test('returns the same results for same objects with different orders', () => {
      const key1 = generateKey({ a: 3, b: [{ x: 4, y: 5, z: 6 }, 7], c: 8 });
      const key2 = generateKey({ c: 8, b: [{ z: 6, y: 5, x: 4 }, 7], a: 3 });
      expect(key1).toBe(key2);
    });
  });

  describe('Helper.jsonStableReplacer', () => {
    test('sorts keys by order', () => {
      const obj = { c: 8, b: [{ z: 6, y: 5, x: 4 }, 7], a: 3 };
      const actual = JSON.stringify(obj, jsonStableReplacer);
      const expected = '{"a":3,"b":[{"x":4,"y":5,"z":6},7],"c":8}';
      expect(actual).toBe(expected);
    });
  });

  describe('Helper.resolveUrl', () => {
    const baseUrl = 'https://github.com/yujiosaka/headless-chrome-crawler';

    test('returns null when the argument is null', () => {
      const actual = resolveUrl(null, baseUrl);
      const expected = null;
      expect(actual).toBe(expected);
    });

    test('returns null when the argument starts With hash', () => {
      const actual = resolveUrl('#headless-chrome-crawler---', baseUrl);
      const expected = null;
      expect(actual).toBe(expected);
    });

    test('returns null when the argument starts with javascript:', () => {
      const actual = resolveUrl('javascript:void(0)', baseUrl); /* eslint no-script-url: 0 */
      const expected = null;
      expect(actual).toBe(expected);
    });

    test('returns null when the argument starts with mailto:', () => {
      const actual = resolveUrl('mail:yujiosaka@example.com', baseUrl);
      const expected = null;
      expect(actual).toBe(expected);
    });

    test('returns full URL when the argument is an absolute URL', () => {
      const actual = resolveUrl('https://github.com/yujiosaka/headless-chrome-crawler', baseUrl);
      const expected = 'https://github.com/yujiosaka/headless-chrome-crawler';
      expect(actual).toBe(expected);
    });

    test('strips hash when the argument is an absolute URL with hash', () => {
      const actual = resolveUrl('https://github.com/yujiosaka/headless-chrome-crawler#headless-chrome-crawler---', baseUrl);
      const expected = 'https://github.com/yujiosaka/headless-chrome-crawler';
      expect(actual).toBe(expected);
    });

    test('resolves url when the argument is a relative URL', () => {
      const actual = resolveUrl('headless-chrome-crawler/settings', baseUrl);
      const expected = 'https://github.com/yujiosaka/headless-chrome-crawler/settings';
      expect(actual).toBe(expected);
    });
  });

  describe('Helper.escapeQuotes', () => {
    describe('when separator option is not set', () => {
      test('does not escape value when no quote, comma or break is found', () => {
        const actual = escapeQuotes('yujiosaka/headless-chrome-crawler');
        const expected = 'yujiosaka/headless-chrome-crawler';
        expect(actual).toBe(expected);
      });

      test('escapes value when commas are found', () => {
        const actual = escapeQuotes('Headless Chrome crawls with jQuery support, powered by Puppeteer');
        const expected = '"Headless Chrome crawls with jQuery support, powered by Puppeteer"';
        expect(actual).toBe(expected);
      });

      test('escapes value when quotes are found', () => {
        const actual = escapeQuotes('# or "npm i headless-chrome-crawler"');
        const expected = '"# or ""npm i headless-chrome-crawler"""';
        expect(actual).toBe(expected);
      });

      test('escapes value when breaks are found', () => {
        const actual = escapeQuotes('yujiosaka\nheadless-chrome-crawler');
        const expected = '"yujiosaka\nheadless-chrome-crawler"';
        expect(actual).toBe(expected);
      });
    });

    describe('when separator is a tab', () => {
      test('does not escape value when no quote, tab or break is found', () => {
        const actual = escapeQuotes('Headless Chrome crawls with jQuery support, powered by Puppeteer', '\t');
        const expected = 'Headless Chrome crawls with jQuery support, powered by Puppeteer';
        expect(actual).toBe(expected);
      });

      test('escapes value when tabs are found', () => {
        const actual = escapeQuotes('Headless Chrome crawls with jQuery support\tpowered by Puppeteer', '\t');
        const expected = '"Headless Chrome crawls with jQuery support\tpowered by Puppeteer"';
        expect(actual).toBe(expected);
      });
    });
  });

  describe('Helper.getRobotsUrl', () => {
    test('locates robots.txt for standard http URL', () => {
      const actual = getRobotsUrl('http://example.com/');
      const expected = 'http://example.com/robots.txt';
      expect(actual).toBe(expected);
    });

    test('locates robots.txt for standard https URL', () => {
      const actual = getRobotsUrl('https://example.com/');
      const expected = 'https://example.com/robots.txt';
      expect(actual).toBe(expected);
    });

    test('locates robots.txt for non-standard http URL', () => {
      const actual = getRobotsUrl('https://example.com:8080/');
      const expected = 'https://example.com:8080/robots.txt';
      expect(actual).toBe(expected);
    });

    test('locates robots.txt for non-standard https URL', () => {
      const actual = getRobotsUrl('https://example.com:8432/');
      const expected = 'https://example.com:8432/robots.txt';
      expect(actual).toBe(expected);
    });
  });

  describe('Helper.lowerBound', () => {
    test('returns the first index for positive values', () => {
      const queue = [
        { priority: 4 },
        { priority: 3 },
        { priority: 1 },
      ];
      const item = { priority: 2 };
      const actual = lowerBound(queue, item, (a, b) => b.priority - a.priority);
      const expected = 2;
      expect(actual).toBe(expected);
    });

    test('returns the first index for negative values', () => {
      const queue = [
        { priority: -1 },
        { priority: -2 },
        { priority: -4 },
      ];
      const item = { priority: -3 };
      const actual = lowerBound(queue, item, (a, b) => b.priority - a.priority);
      const expected = 2;
      expect(actual).toBe(expected);
    });

    test('returns the first index for mixed values', () => {
      const queue = [
        { priority: 1 },
        { priority: 0 },
        { priority: -2 },
      ];
      const item = { priority: -1 };
      const actual = lowerBound(queue, item, (a, b) => b.priority - a.priority);
      const expected = 2;
      expect(actual).toBe(expected);
    });

    test('returns the first index when queue is long', () => {
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
      expect(actual).toBe(expected);
    });
  });

  describe('Helper.checkDomainMatch', () => {
    test('returns false for empty array', () => {
      const actual = checkDomainMatch([], '127.0.0.1');
      const expected = false;
      expect(actual).toBe(expected);
    });

    test('returns false when no domain fully matches requested hostname', () => {
      const actual = checkDomainMatch(['localhost', '0.0.0.0'], '127.0.0.1');
      const expected = false;
      expect(actual).toBe(expected);
    });

    test('returns false when no domain matches requested hostname by regular expression', () => {
      const actual = checkDomainMatch([/^localhost$/, /^\d\.\d\.\d\.\d$/], '127.0.0.1');
      const expected = false;
      expect(actual).toBe(expected);
    });

    test('returns true when a domain fully matches requested hostname', () => {
      const actual = checkDomainMatch(['localhost', '127.0.0.1'], '127.0.0.1');
      const expected = true;
      expect(actual).toBe(expected);
    });

    test('returns true when a domain fully matches requested hostname by regular expression', () => {
      const actual = checkDomainMatch([/^localhost$/, /^\d+\.\d+\.\d+\.\d+$/], '127.0.0.1');
      const expected = true;
      expect(actual).toBe(expected);
    });
  });

  describe('Helper.getSitemapUrls', () => {
    test('returns empty array for empty xml', () => {
      const actual = getSitemapUrls('');
      const expected = [];
      expect(actual).toEqual(expected);
    });

    test('returns empty array for no urls', () => {
      const actual = getSitemapUrls(`
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      </urlset>
      `);
      const expected = [];
      expect(actual).toEqual(expected);
    });

    test('returns a url', () => {
      const actual = getSitemapUrls(`
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://github.com/yujiosaka/headless-chrome-crawler/issues</loc></url>
      </urlset>
      `);
      const expected = ['https://github.com/yujiosaka/headless-chrome-crawler/issues'];
      expect(actual).toEqual(expected);
    });
  });

  describe('Helper.unescape', () => {
    test('returns empty string for empty argument', () => {
      const actual = unescape('');
      const expected = '';
      expect(actual).toBe(expected);
    });

    test('returns the same string for non-escaped argument', () => {
      const actual = unescape('https://github.com/yujiosaka/headless-chrome-crawler/issues');
      const expected = 'https://github.com/yujiosaka/headless-chrome-crawler/issues';
      expect(actual).toBe(expected);
    });

    test('returns the unescaped argument', () => {
      const actual = unescape('&lt;loc&gt;https://github.com/yujiosaka/headless-chrome-crawler/issues?a=1&amp;b=2&lt;/loc&gt;');
      const expected = '<loc>https://github.com/yujiosaka/headless-chrome-crawler/issues?a=1&b=2</loc>';
      expect(actual).toBe(expected);
    });
  });

  describe('Helper.stringifyArgument', () => {
    test('stringifies undefined', () => {
      const actual = stringifyArgument(undefined);
      const expected = 'undefined';
      expect(actual).toBe(expected);
    });

    test('stringifies null', () => {
      const actual = stringifyArgument(null);
      const expected = 'null';
      expect(actual).toBe(expected);
    });

    test('stringifies boolean', () => {
      const actual = stringifyArgument(false);
      const expected = 'false';
      expect(actual).toBe(expected);
    });

    test('stringifies string', () => {
      const actual = stringifyArgument('https://github.com/yujiosaka/headless-chrome-crawler');
      const expected = "'https://github.com/yujiosaka/headless-chrome-crawler'";
      expect(actual).toBe(expected);
    });

    test('stringifies number', () => {
      const actual = stringifyArgument(3);
      const expected = '3';
      expect(actual).toBe(expected);
    });

    test('stringifies function', () => {
      const actual = stringifyArgument(noop);
      const expected = '[Function: noop]';
      expect(actual).toBe(expected);
    });

    test('stringifies object', () => {
      const actual = stringifyArgument({
        jQuery: false,
        url: 'https://github.com/yujiosaka/headless-chrome-crawler',
        retryCount: 3,
        evaluatePage: noop,
        cache: null,
      });
      const expected = "{ jQuery: false, url: 'https://github.com/yujiosaka/headless-chrome-crawler', retryCount: 3, evaluatePage: [Function: noop], cache: null }";
      expect(actual).toBe(expected);
    });
  });

  describe('Helper.debugConsole', () => {
    test('does not throw an error', () => {
      expect(() => {
        debugConsole('log init at https://github.com/yujiosaka/headless-chrome-crawler');
      }).not.toThrow();
    });
  });

  describe('Helper.debugDialog', () => {
    test('does not throw an error', () => {
      expect(() => {
        debugDialog('beforeUnload This page is asking you to confirm that you want to leave - data you have entered may not be saved. at https://github.com/yujiosaka/headless-chrome-crawler');
      }).not.toThrow();
    });
  });
});
