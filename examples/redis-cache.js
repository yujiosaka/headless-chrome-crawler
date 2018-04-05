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

(async () => {
  const crawler1 = await launch(true); // Launch the crawler with persisting cache
  crawler1.queue('https://example.com/');
  crawler1.queue('https://example.net/');
  await crawler1.onIdle();
  await crawler1.close(); // Close the crawler but cache won't be cleared
  const crawler2 = await launch(false); // Launch the crawler again without persisting cache
  crawler2.queue('https://example.net/'); // This queue won't be requested because cache remains
  crawler2.queue('https://example.org/');
  await crawler2.onIdle();
  await crawler2.close();
})();
