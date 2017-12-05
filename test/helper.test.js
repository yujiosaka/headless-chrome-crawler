const assert = require('assert');
const { delay } = require('../lib/helper');

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
});
