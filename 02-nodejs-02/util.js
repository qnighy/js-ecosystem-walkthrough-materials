var private_value = 42;
// exports.square = ... でもよい
module.exports.square = function(x) {
  return x * x;
};
