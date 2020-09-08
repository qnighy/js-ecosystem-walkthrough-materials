var module1 = require('./module1'); // => Hello, world!
var module2 = require('./module2'); // => Hello, world!

console.log(module1.fresh()); // => 1
console.log(module1.fresh()); // => 2
console.log(module2.fresh()); // => 1
console.log(module2.fresh()); // => 2
console.log(module1.fresh == module2.fresh); // => false
