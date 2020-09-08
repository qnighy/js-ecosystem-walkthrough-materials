console.log("Hello, world!");

var counter = 1;
exports.fresh = function() {
  return counter++;
};
