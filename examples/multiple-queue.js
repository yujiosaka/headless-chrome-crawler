const HCCrawler = require('headless-chrome-crawler');

(async () => {
  const crawler = await HCCrawler.launch({
    evaluatePage: (() => ({
      title: $('title').text(),
    })),
    onSuccess: (result => {
      console.log(`Got ${result.result.title} for ${result.options.url}.`);
    }),
  });
  await crawler.queue('https://example.com/'); // Queue a request
  await crawler.queue(['https://example.net/', { url: 'https://example.org/' }]); // Queue multiple requests in different styles
  await crawler.onIdle();
  await crawler.close();
})();
