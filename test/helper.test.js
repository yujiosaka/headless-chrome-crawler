const assert = require('assert');
const { noop } = require('lodash');
const {
  delay,
  jsonStableReplacer,
  hash,
  generateKey,
  resolveUrl,
  escapeQuotes,
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
