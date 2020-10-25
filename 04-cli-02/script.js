var fs = require("fs");

var hasDevDependencies = false;
try {
  require("@test/devtool1");
  hasDevDependencies = true;
} catch (e) { }

var msg = `${process.env.npm_package_name}: ${process.env.npm_lifecycle_event} at ${__dirname}`;
if (hasDevDependencies) {
  msg += " (with dev deps)";
}

var logFile = process.env.SCRIPT_LOG_FILE;
if (!logFile) {
  console.error("SCRIPT_LOG_FILE not set");
  process.exit(1);
}
if (!logFile.startsWith("/")) {
  console.error(`SCRIPT_LOG_FILE must be an absolute path; got ${logFile}`);
  process.exit(1);
}
fs.writeFileSync(logFile, msg + "\n", { flag: "a" });
