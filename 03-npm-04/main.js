const module1 = require('./module1'); // => Loading: module1.js
const module2 = require('./module2'); // Prints nothing

module1.printPath(); // => __filename = module1.js
module2.printPath(); // => __filename = module1.js
