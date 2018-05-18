const SessionCache = require('../../cache/session');
const { tearUp, tearDown, testSuite } = require('./helper');

describe('Cache', () => {
  describe('SessionCache', () => {
    beforeEach(async () => {
      this.cache = new SessionCache();
    });

    tearUp(this);
    tearDown(this);
    testSuite(this);
  });
});
