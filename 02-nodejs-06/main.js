var module1a = require('./module1'); // => Hello, world!
var module1b = require('./module1'); // (no output)

console.log(module1a.fresh()); // => 1
console.log(module1a.fresh()); // => 2
console.log(module1b.fresh()); // => 3
console.log(module1b.fresh()); // => 4
console.log(module1a.fresh == module1b.fresh); // => true
