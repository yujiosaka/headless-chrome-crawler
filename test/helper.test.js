const assert = require('assert');
const {
  delay,
  jsonStableReplacer,
  hash,
  generateKey,
  resolveUrl,
  debugRequest,
  debugBrowser,
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

  describe('Helper.debugRequest', () => {
    it('does not throw an error', () => {
      assert.doesNotThrow(() => {
        debugRequest('Start requesting https://github.com/yujiosaka/headless-chrome-crawler');
      });
    });
  });

  describe('Helper.debugBrowser', () => {
    it('does not throw an error', () => {
      assert.doesNotThrow(() => {
        debugBrowser('Console log init https://github.com/yujiosaka/headless-chrome-crawler');
      });
    });
  });
});
