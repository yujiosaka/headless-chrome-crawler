const _ = require('lodash');
const assert = require('assert');
const sinon = require('sinon');
const HCCrawler = require('../');
const Crawler = require('../lib/crawler');

const URL1 = 'http://www.example.com/';
const URL2 = 'http://www.example.net/';
const URL3 = 'http://www.example.org/';

describe('HCCrawler', () => {
  let crawler;

  afterEach(() => {
    Crawler.prototype.crawl.restore();
  });

  context('when crawl succeeds', () => {
    beforeEach(() => {
      sinon.stub(Crawler.prototype, 'crawl').returns(Promise.resolve());
    });

    context('when launched without necessary options', () => {
      before(() => (
        HCCrawler.launch()
          .then(_crawler => {
            crawler = _crawler;
          })
      ));

      after(() => crawler.close());

      it('throws error when queueing null', () => {
        assert.throws(() => {
          crawler.queue(null);
        });
      });

      it('throws error when queueing without URL', () => {
        assert.throws(() => {
          crawler.queue({ evaluatePage: _.noop, onSuccess: _.noop });
        });
      });

      it('throws error when queueing without evaluatePage', () => {
        assert.throws(() => {
          crawler.queue({ url: URL1, onSuccess: _.noop });
        });
      });

      it('throws error when queueing without onSuccess', () => {
        assert.throws(() => {
          crawler.queue({ url: URL1, evaluatePage: _.noop });
        });
      });

      it('crawls with necessary options', () => {
        assert.doesNotThrow(() => {
          crawler.queue({ url: URL1, evaluatePage: _.noop, onSuccess: _.noop });
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 1);
          });
      });
    });

    context('when launched with necessary options', () => {
      before(() => (
        HCCrawler.launch({
          evaluatePage: _.noop,
          onSuccess: _.noop,
          device: 'iPhone 6',
        })
          .then(_crawler => {
            crawler = _crawler;
          })
      ));

      after(() => crawler.close());

      it('crawls with single string options', () => {
        assert.doesNotThrow(() => {
          crawler.queue(URL1);
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 1);
          });
      });

      it('crawls with multiple string options', () => {
        assert.doesNotThrow(() => {
          crawler.queue([URL1, URL2, URL3]);
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 3);
          });
      });

      it('crawls with single object options', () => {
        assert.doesNotThrow(() => {
          crawler.queue({ url: URL1 });
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 1);
          });
      });

      it('crawls with multiple object options', () => {
        assert.doesNotThrow(() => {
          crawler.queue([{ url: URL1 }, { url: URL2 }, { url: URL3 }]);
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 3);
          });
      });

      it('crawls with mixed style options', () => {
        assert.doesNotThrow(() => {
          crawler.queue([URL1, { url: URL2 }]);
          crawler.queue(URL3);
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 3);
          });
      });

      it('throws error with unavailable device', () => {
        assert.throws(() => {
          crawler.queue({ url: URL1, device: 'do-not-exist' });
        });
      });

      it('overrides device device', () => {
        assert.doesNotThrow(() => {
          crawler.queue({ url: URL1, device: 'Nexus 6' });
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 1);
            assert.equal(Crawler.prototype.crawl.firstCall.thisValue._options.device, 'Nexus 6');
          });
      });

      it('throws when delay is set', () => {
        assert.throws(() => {
          crawler.queue({ url: URL1, delay: 100 });
        });
      });

      it('does not skip request when preRequest returns true', () => {
        function preRequest() {
          return new Promise(resolve => {
            resolve(true);
          }, 100);
        }

        assert.doesNotThrow(() => {
          crawler.queue({ url: URL1, preRequest });
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 1);
          });
      });

      it('skips request when preRequest returns false', () => {
        function preRequest() {
          return new Promise(resolve => {
            resolve(false);
          }, 100);
        }

        assert.doesNotThrow(() => {
          crawler.queue({ url: URL1, preRequest });
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 0);
          });
      });

      it('requests when domain is allowed', () => {
        assert.doesNotThrow(() => {
          crawler.queue({ url: URL1, allowedDomains: ['example.com', 'example.net'] });
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 1);
          });
      });

      it('skips request when domain is not allowed', () => {
        assert.doesNotThrow(() => {
          crawler.queue({ url: URL1, allowedDomains: ['example.net', 'example.org'] });
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 0);
          });
      });
    });

    context('when launched with maxConcurrency: 1', () => {
      before(() => (
        HCCrawler.launch({
          evaluatePage: _.noop,
          onSuccess: _.noop,
          maxConcurrency: 1,
        })
          .then(_crawler => {
            crawler = _crawler;
          })
      ));

      after(() => crawler.close());

      it('obeys priority order', () => {
        assert.doesNotThrow(() => {
          crawler.queue({ url: URL1 });
          crawler.queue({ url: URL2, priority: 1 });
          crawler.queue({ url: URL3, priority: 2 });
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 3);
            assert.equal(Crawler.prototype.crawl.firstCall.thisValue._options.url, URL1);
            assert.equal(Crawler.prototype.crawl.secondCall.thisValue._options.url, URL3);
            assert.equal(Crawler.prototype.crawl.thirdCall.thisValue._options.url, URL2);
          });
      });

      it('does not throw when delay is set', () => {
        assert.doesNotThrow(() => {
          crawler.queue({ url: URL1, delay: 100 });
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 1);
          });
      });
    });

    context('when launched with maxRequest option', () => {
      beforeEach(() => (
        HCCrawler.launch({
          evaluatePage: _.noop,
          onSuccess: _.noop,
          maxConcurrency: 1,
          maxRequest: 2,
        })
          .then(_crawler => {
            crawler = _crawler;
          })
      ));

      afterEach(() => crawler.close());

      it('requests until maxRequest', () => {
        assert.doesNotThrow(() => {
          crawler.queue({ url: URL1 });
          crawler.queue({ url: URL2 });
          crawler.queue({ url: URL3 });
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 2);
          });
      });

      it('resumes after maxRequest', () => {
        assert.doesNotThrow(() => {
          crawler.queue({ url: URL1 });
          crawler.queue({ url: URL2 });
          crawler.queue({ url: URL3 });
        });
        return crawler.onIdle()
          .then(() => {
            crawler.setMaxRequest(3);
            crawler.resume();
            return crawler.onIdle();
          })
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 3);
          });
      });
    });

    context('when launched with session cache', () => {
      before(() => (
        HCCrawler.launch({
          evaluatePage: _.noop,
          onSuccess: _.noop,
          maxConcurrency: 1,
          maxRequest: 2,
          cache: new HCCrawler.SessionCache(),
        })
          .then(_crawler => {
            crawler = _crawler;
          })
      ));

      after(() => crawler.close());

      it('does not requested already cached url', () => {
        assert.doesNotThrow(() => {
          crawler.queue({ url: URL1 });
          crawler.queue({ url: URL2 });
          crawler.queue({ url: URL1 }); // The queue won't be requested
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 2);
          });
      });
    });

    context('when launched with redis cache', () => {
      before(() => (
        HCCrawler.launch({
          evaluatePage: _.noop,
          onSuccess: _.noop,
          maxConcurrency: 1,
          maxRequest: 2,
          cache: new HCCrawler.RedisCache(),
        })
          .then(_crawler => {
            crawler = _crawler;
          })
      ));

      after(() => crawler.close());

      it('does not requested already cached url', () => {
        assert.doesNotThrow(() => {
          crawler.queue({ url: URL1 });
          crawler.queue({ url: URL2 });
          crawler.queue({ url: URL1 }); // The queue won't be requested
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 2);
          });
      });
    });
  });

  context('when crawl fails', () => {
    beforeEach(() => {
      sinon.stub(Crawler.prototype, 'crawl').returns(Promise.reject());
    });

    context('when launched with necessary options', () => {
      before(() => (
        HCCrawler.launch({
          evaluatePage: _.noop,
          onSuccess: _.noop,
        })
          .then(_crawler => {
            crawler = _crawler;
          })
      ));

      after(() => crawler.close());

      it('retries and gives up', () => {
        assert.doesNotThrow(() => {
          crawler.queue({ url: URL1, retryCount: 3, retryDelay: 100 });
        });
        return crawler.onIdle()
          .then(() => {
            assert.equal(Crawler.prototype.crawl.callCount, 4);
          });
      });
    });
  });
});
