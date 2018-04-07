const HCCrawler = require('headless-chrome-crawler');

(async () => {
  const crawler = await HCCrawler.launch({
    evaluatePage: (() => {
      throw new Error("Global functions won't be called");
    }),
    onSuccess: (result => {
      console.log(`Got ${result.result.title} for ${result.options.url}.`);
    }),
  });
  await crawler.queue({
    url: 'https://example.com/',
    evaluatePage: (() => ({
      title: $('title').text(),
    })),
  });
  await crawler.onIdle();
  await crawler.close();
})();
