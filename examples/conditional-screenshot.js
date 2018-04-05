const HCCrawler = require('headless-chrome-crawler');

const PATH = './tmp/';

(async () => {
  const crawler = await HCCrawler.launch({
    onSuccess: (result => {
      console.log(`Screenshot is saved as ${PATH}${result.options.saveAs} for ${result.options.url}.`);
    }),
    preRequest: (options => {
      if (!options.saveAs) return false; // Skip the request by returning false
      options.screenshot = { path: `${PATH}${options.saveAs}` };
      return true;
    }),
  });
  crawler.queue({ url: 'https://example.com/' });
  // saveAs is a custom option for preRequest to conditionally modify options and skip requests
  crawler.queue({ url: 'https://example.net/', saveAs: 'example-net.png' });
  crawler.queue({ url: 'https://example.org/', saveAs: 'example-org.png' });
  await crawler.onIdle();
  await crawler.close();
})();
