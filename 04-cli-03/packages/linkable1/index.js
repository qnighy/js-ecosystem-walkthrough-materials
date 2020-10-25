try {
  const foo1 = require("@test/foo1");
  console.log(`${__dirname} -> ${foo1.package_dir}`);
} catch (e) {
  console.log(`${__dirname} -> @test/foo1: not found`);
}
try {
  const bar1 = require("@test/bar1");
  console.log(`${__dirname} -> ${bar1.package_dir}`);
} catch (e) {
  console.log(`${__dirname} -> @test/bar1: not found`);
}
console.log(`Loaded: ${__dirname}`);
exports.package_dir = __dirname;
