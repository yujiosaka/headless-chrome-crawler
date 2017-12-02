exports.delay = function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};
