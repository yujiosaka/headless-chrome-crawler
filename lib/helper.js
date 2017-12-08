const debugRequest = require('debug')('hccrawler:request');
const debugBrowser = require('debug')('hccrawler:browser');

class Util {
  /**
   * Wait until specified milliseconds
   * @param {number} milliseconds
   * @return {Promise} resolved after waiting specified milliseconds
   * @static
   */
  static delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  /**
   * Debug log for request events
   * @param {string} msg
   * @static
   */
  static debugRequest(msg) {
    debugRequest(msg);
  }

  /**
   * Debug log for browser events
   * @param {string} msg
   * @static
   */
  static debugBrowser(msg) {
    debugBrowser(msg);
  }
}

module.exports = Util;
