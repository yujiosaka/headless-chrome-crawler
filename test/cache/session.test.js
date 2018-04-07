const SessionCache = require('../../cache/session');
const { tearUp, tearDown, testSuite } = require('./helper');

describe('Cache', function () {
  describe('SessionCache', function () {
    beforeEach(async function () {
      this.cache = new SessionCache();
    });

    tearUp();
    tearDown();
    testSuite();
  });
});
