// Required: assigning to module.exports
// Optional: assigning to exports
module.exports = exports = function(x) {
  return x * x;
};
// A function is by itself an object; it can have properties
exports.version = "0.1.0";
