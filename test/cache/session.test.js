const SessionCache = require('../../cache/session');
const { testSuite, closeCacheAfterEach } = require('./helper');

describe('SessionCache', function () {
  beforeEach(async function () {
    this.cache = new SessionCache();
    await this.cache.init();
    await this.cache.clear();
  });
  closeCacheAfterEach();
  testSuite();
});
