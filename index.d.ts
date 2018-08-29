// Type definitions for headless-chrome-crawler
// Project: https://github.com/yujiosaka/headless-chrome-crawler
// Definitions by: Sebastian Richter <https://github.com/BassT>

/*~ This is the module template file for class modules.
 *~ You should rename it to index.d.ts and place it in a folder with the same name as the module.
 *~ For example, if you were writing a file for "super-greeter", this
 *~ file should be 'super-greeter/index.d.ts'
 */

/*~ Note that ES6 modules cannot directly export class objects.
 *~ This file should be imported using the CommonJS-style:
 *~   import x = require('someLibrary');
 *~
 *~ Refer to the documentation to understand common
 *~ workarounds for this limitation of ES6 modules.
 */

 /*~ If this module is a UMD module that exposes a global variable 'myClassLib' when
 *~ loaded outside a module loader environment, declare that global here.
 *~ Otherwise, delete this declaration.
 */
// export as namespace myClassLib;

/*~ This declaration specifies that the class constructor function
 *~ is the exported object from the file
 */
export = HCCrawler;

import { EventEmitter } from "events";

/*~ Write your module's methods and properties in this class */
declare class HCCrawler extends EventEmitter {
  static connect(options?: ConnectOptions): Promise<HCCrawler>;
  static launch(options?: LaunchOptions): Promise<HCCrawler>;
  queue(options: QueueOptions): Promise<void>;

  static Events: {
    RequestStarted: "requeststarted";
    RequestSkipped: "requestskipped";
    RequestDisallowed: "requestdisallowed";
    RequestFinished: "requestfinished";
    RequestRetried: "requestretried";
    RequestFailed: "requestfailed";
    RobotsTxtRequestFailed: "robotstxtrequestfailed";
    SitemapXmlRequestFailed: "sitemapxmlrequestfailed";
    MaxDepthReached: "maxdepthreached";
    MaxRequestReached: "maxrequestreached";
    Disconnected: "disconnected";
  };
}

interface ConnectOptions extends SharedQueueOptions {
  /**
   * Maximum number of pages to open concurrently, defaults to 10.
   */
  maxConcurrency?: number;

  /**
   * Maximum number of requests, defaults to 0. Pass 0 to disable the limit.
   */
  maxRequest?: number;

  /**
   * An exporter object which extends BaseExporter's interfaces to export results, default to null.
   */
  exporter?: BaseExporter;

  /**
   * A cache object which extends BaseCache's interfaces to remember and skip duplicate requests, defaults to a SessionCache object.
   */
  cache?: BaseCache;

  /**
   * Whether to clear cache on closing or disconnecting from the Chromium instance, defaults to false.
   */
  presistCache?: boolean;

  /**
   * Function to do anything like modifying options before each request.
   * You can also return false if you want to skip the request.
   */
  preRequest?: (options?: QueueOptions) => Promise<boolean>;

  /**
   * Function to be called when `evaluatePage()` succedes.
   */
  onSuccess?: (result: SuccessResult<any>) => void;

  /**
   * Function to be called when request fails.
   */
  onError?: (error: Error) => void;
}

interface LaunchOptions extends ConnectOptions {}

interface SuccessResult<EvaluatePageResult> {
  redirectChain: Array<{ url: string; headers: { [prop: string]: any } }>;
  cookies: ICookie[];
  response: {
    /**
     * Whether the status code in the range 200-299 or not.
     */
    ok: boolean;

    /**
     * Status code of the request.
     */
    status: string;

    /**
     * Last requested url.
     */
    url: string;

    /**
     * Response headers.
     */
    headers: Object;
  };

  /**
   * Crawler.queue()'s options with default values.
   */
  options: OnlyQueueOptions & SharedQueueOptions;

  /**
   * The result resolved from evaluatePage() option.
   */
  result: EvaluatePageResult;

  /**
   * Buffer with the screenshot image, which is null when screenshot option not passed.
   */
  screenshot: Buffer | null;

  /**
   * List of links found in the requested page.
   */
  links: string[];

  /**
   * Depth of the followed links.
   */
  depth: number;

  /**
   * The previous request's url. The value is null for the initial request.
   */
  previousUrl: string | null;
}

interface OnlyQueueOptions {
  /**
   * Maximum depth for the crawler to follow links automatically, default to 1.
   * Leave default to disable following links.
   */
  maxDepth?: number;

  /**
   * Whether to skip duplicate requests, default to true.
   * The request is considered to be the same if url, userAgent, device and extraHeaders are strictly the same.
   */
  skipDuplicates?: boolean;

  /**
   * Whether to skip requests already appeared in redirect chains of requests, default to false.
   * This option is ignored when `skipDuplicates` is set false.
   */
  skipRequestedRedirect?: boolean;

  /**
   * Whether to obey robots.txt, default to true.
   */
  obeyRobotsTxt?: boolean;

  /**
   * Whether to use sitemap.xml to find locations, default to false.
   */
  followSitemapXml?: boolean;

  /**
   * When to consider navigation succeeded, defaults to `load`.
   * See the Puppeteer's page.goto()'s `waitUntil` options for further details.
   */
  waitUntil?: string | string[];

  /**
   * See Puppeteer's page.waitFor() for further details.
   */
  waitFor?: {
    /**
     * A selecctor, predicate or timeout to wait for.
     */
    selectorOrFunctionOrTimeout?: string | number | Function;

    /**
     * Optional waiting parameters.
     */
    options?: any;

    /**
     * List of arguments to pass to the predicate function.
     */
    args?: any[];
  };

  /**
   * Screenshot option, defaults to `null`.
   * This option is passed to Puppeteer's page.screenshot().
   * Pass `null` or leave default to disable screenshot.
   */
  screenshot?: { [prop: string]: any };

  /**
   * See [Puppeteer's page.setViewport()](https://github.com/GoogleChrome/puppeteer/blob/master/docs/api.md#pagesetviewportviewport) for further details.
   */
  viewport?: {
    /**
     * Page width in pixels.
     */
    width?: number;

    /**
     * Page height in pixels.
     */
    height?: number;
  };

  /**
   * User agent string to override in this page.
   */
  userAgent?: string;
}

interface SharedQueueOptions {
  /**
   * Url to navigate to.
   * The url should include scheme, e.g. https://.
   */
  url?: string;

  /**
   * Basic priority of queues, defaults to 1.
   * Priority with larger number is preferred.
   */
  priority?: number;

  /**
   * Whether to adjust priority based on its depth, defaults to true.
   * Leave default to increase priority for higher depth, which is depth-first search.
   */
  depthPriority?: boolean;

  /**
   * List of domains allowed to request.
   * Pass null or leave default to skip checking allowed domain
   */
  allowedDomains?: Array<string | RegExp> | null;

  /**
   * List of domains not allowed to request.
   * Pass null or leave default to skip checking denied domain.
   */
  deniedDomains?: Array<string | RegExp> | null;

  /**
   * Number of milliseconds after each request, defaults to 0.
   * When delay is set, maxConcurrency option must be 1.
   */
  delay?: number;

  /**
   * Navigation timeout in milliseconds, defaults to 30 seconds, pass 0 to disable timeout.
   */
  timeout?: number;

  /**
   * Number of limit when retry fails, default to `3`.
   */
  retryCount?: number;

  /**
   * Number of milliseconds after each retry fails, defaults to `10000`.
   */
  retryDelay?: number;

  /**
   * Whether to automatically add jQuyer tag to page, defaults to `true`.
   */
  jQuery?: boolean;

  /**
   * Whether to enable browser cache for each request, defaults to `true`.
   */
  browserCache?: boolean;

  /**
   * Device to emulate.
   * Available devices are listed [here](https://github.com/GoogleChrome/puppeteer/blob/master/DeviceDescriptors.js).
   */
  device?: string;

  /**
   * Username for basic authentication.
   * Pass `null` if it's not necessary.
   */
  username?: string;

  /**
   * Password for basic authentication.
   * Pass `null` if it's not necessary.
   */
  password?: string;

  /**
   * An object containing additional headers to be sent with every request.
   */
  extraHeaders?: { [key: string]: string };

  /**
   * List of cookies to be sent with every request.
   * Either url or domain must be specified for each cookie.
   */
  cookies?: ICookie[];

  /**
   * Function to be evaluated in browsers.
   * Return serializable object.
   * If it's not serializable, the result will be `undefined`.
   */
  evaluatePage?: () => any;
}

type QueueOptions = SharedQueueOptions & OnlyQueueOptions;

interface ICookie {
  name: string;
  value: string;
  domain: string;
  path: string;

  /**
   * Unix time in seconds.
   */
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  session: boolean;
  sameSite: "Strict" | "Lax";
}

declare class BaseCache {}

declare class BaseExporter {}
