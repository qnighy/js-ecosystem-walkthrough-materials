import fs = require("fs");
import express = require("express");
import validate = require("validate-npm-package-name");
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
  "dist-tags"?: { [key: string]: string };
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

(async () => {
  const index: Index = {};

  const packagesDir = yargs.argv._[0] || "./packages";

  console.log(`Searching for *.tgz files in ${packagesDir}`);
  for (const filename of await fs.promises.readdir(packagesDir)) {
    if (!filename.match(/\.tgz$/m)) {
      continue;
    }

    let packageJson: packageJsons.PackageJson;
    try {
      packageJson = await packageJsons.extractPackageJson(
        `${packagesDir}/${filename}`
      );
    } catch (e: unknown) {
      console.error(e);
      continue;
    }

    index[packageJson.name] ||= {
      _id: packageJson.name,
      name: packageJson.name,
      versions: {},
    };
    index[packageJson.name].versions[packageJson.version] = {
      ...packageJson,
      _id: `${packageJson.name}@${packageJson.version}`,
      dist: {
        tarball: filename,
      },
    };
    console.log(
      `Found ${packageJson.name}@${packageJson.version} (${packagesDir}/${filename})`
    );
  }

  const app = express();
  const port = parseInt(process.env.TEST_REGISTRY_PORT || "8765");

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

  app.listen(port, () => {
    console.log(`Test registry listening at http://localhost:${port}`);
  });
})();
