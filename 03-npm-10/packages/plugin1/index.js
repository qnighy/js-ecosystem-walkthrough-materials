try {
  const framework1 = require("@test/framework1");
  console.log(`Want ^1.0.0, got ${framework1.version}`);
} catch(e) {
  console.error(e);
}
console.log(`Loaded: ${__filename}`);
