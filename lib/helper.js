class Util {
  /**
   * @param {number} milliseconds
   * @return {Promise} resolved after waiting specified milliseconds
   * @static
   */
  static delay(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }
}

module.exports = Util;
