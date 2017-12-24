const HCCrawler = require('headless-chrome-crawler');
const RedisCache = require('headless-chrome-crawler/cache/redis');

const cache = new RedisCache({ host: '127.0.0.1', port: 6379 });

function launch(persistCache) {
  return HCCrawler.launch({
    onSuccess: (result => {
      console.log(`Requested ${result.options.url}.`);
    }),
    cache,
    persistCache, // Cache won't be cleared when closing the crawler if set true
  });
}

launch(true) // Launch the crawler with persisting cache
  .then(crawler => {
    crawler.queue('https://example.com/');
    crawler.queue('https://example.net/');
    return crawler.onIdle()
      .then(() => crawler.close()); // Close the crawler but cache won't be cleared
  })
  .then(() => launch(false)) // Launch the crawler again without persisting cache
  .then(crawler => {
    crawler.queue('https://example.net/'); // This queue won't be requested because cache remains
    crawler.queue('https://example.org/');
    return crawler.onIdle()
      .then(() => crawler.close());
  });
