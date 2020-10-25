import fs = require("fs");
import crypto = require("crypto");
import express = require("express");
import validate = require("validate-npm-package-name");
import semver = require("semver");
import yargs = require("yargs");
import packageJsons = require("./package-jsons");

interface PackageVersion extends packageJsons.PackageJson {
  gitHead?: string;
  bugs?: { url: string };
  homepage?: string;
  _id?: string;
  _nodeVersion?: string;
  _npmVersion?: string;
  dist?: {
    integrity?: string;
    shasum?: string;
    tarball?: string;
    fileCount?: number;
    unpackedSize?: number;
    "npm-signature"?: string;
  };
  maintainers?: {
    email: string;
    name: string;
  }[];
  _npmUser?: {
    name: string;
    email: string;
  };
  // directories?: {};
  _hasShrinkwrap?: false;
}

interface Package {
  _id: string;
  _rev?: string;
  name: string;
  description?: string;
  "dist-tags": {
    latest: string;
    [key: string]: string;
  };
  versions: { [version: string]: PackageVersion };
  readme?: string;
  maintainers?: {
    email: string;
    name: string;
  }[];
  time?: { [key: string]: string };
  users?: { [key: string]: boolean };
  readmeFilename?: string;
  keywords?: string[];
  repository?: { type: string; url?: string };
  bugs?: { url: string };
  license?: string;
  homepage?: string;
}

type Index = { [name: string]: Package };

const port = parseInt(process.env.TEST_REGISTRY_PORT || "8765");

(async () => {
  const index: Index = {};

  const packagesDir = yargs.argv._[0] || "./packages";

  console.log(`Searching for *.tgz files in ${packagesDir}`);
  for (const filename of await fs.promises.readdir(packagesDir)) {
    if (!filename.match(/\.tgz$/m)) {
      continue;
    }
    const path = `${packagesDir}/${filename}`;

    let packageJson: packageJsons.PackageJson;
    try {
      packageJson = await packageJsons.extractPackageJson(path);
    } catch (e: unknown) {
      console.error(e);
      continue;
    }

    const shasum = crypto.createHash("sha1");
    for await (const chunk of fs.createReadStream(path)) {
      shasum.update(chunk);
    }

    index[packageJson.name] ||= {
      _id: packageJson.name,
      name: packageJson.name,
      versions: {},
      "dist-tags": {
        latest: packageJson.version,
      },
    };
    index[packageJson.name].versions[packageJson.version] = {
      ...packageJson,
      _id: `${packageJson.name}@${packageJson.version}`,
      dist: {
        tarball: `http://localhost:${port}/${filename}`,
        shasum: shasum.digest("hex"),
      },
    };
    if (
      semver.lt(
        index[packageJson.name]["dist-tags"].latest,
        packageJson.version
      )
    ) {
      index[packageJson.name]["dist-tags"].latest = packageJson.version;
    }
    console.log(
      `Found ${packageJson.name}@${packageJson.version} (${packagesDir}/${filename})`
    );
  }

  const app = express();

  app.use("/", express.static(packagesDir));
  app.get("/:packageName", (req, res, next) => {
    const packageName = req.params.packageName;
    if (!validate(packageName).validForNewPackages) {
      return next("router");
    }
    if (!index[packageName]) {
      console.info(`No package: ${packageName}`);
      return next("router");
    }
    const packageData = index[packageName];
    res.json(packageData);
  });

  app.put("/:packageName", (req, res, next) => {
    const packageName = req.params.packageName;
    if (!validate(packageName).validForNewPackages) {
      return next("router");
    }
    console.warn(`Requested publishing ${packageName} (ignoring)`);
    res.json({});
  });

  app.listen(port, () => {
    console.log(`Test registry listening at http://localhost:${port}`);
  });
})();
