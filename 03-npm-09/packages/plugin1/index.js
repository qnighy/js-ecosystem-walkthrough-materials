try {
  require('@test/framework1');
} catch(e) {
  console.error(e);
}
try {
  require('@test/framework2');
} catch(e) {
  console.error(e);
}
console.log(`Loaded: ${__filename}`);
