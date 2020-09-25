import fs = require("fs");
import express = require("express");
import stream = require("stream");
import zlib = require("zlib");
import tar = require("tar-stream");
import validate = require("validate-npm-package-name");

interface PackageJson {
  name: string,
  version: string,
  description?: string,
  private?: boolean,
  files?: string[],
  scripts: { [script: string]: string },
  keywords?: string[],
  author?: string,
  license?: string,
  repository?: { type: "git", url: string },
  dependencies?: { [name: string]: string },
  devDependencies?: { [name: string]: string },
  optionalDependencies?: { [name: string]: string },
  peerDependencies?: { [name: string]: string },
  bundledDependencies?: { [name: string]: string },
}

interface PackageVersion extends PackageJson {
  gitHead?: string,
  bugs?: { url: string },
  homepage?: string,
  _id?: string,
  _nodeVersion?: string,
  _npmVersion?: string,
  dist?: {
    integrity?: string,
    shasum?: string,
    tarball?: string,
    fileCount?: number,
    unpackedSize?: number,
    "npm-signature"?: string
  },
  maintainers?: {
    email: string,
    name: string
  }[],
  _npmUser?: {
    name: string,
    email: string
  },
  directories?: {},
  _hasShrinkwrap?: false
}

interface Package {
  _id: string,
  _rev?: string,
  name: string,
  description?: string,
  "dist-tags"?: { [key: string]: string },
  versions: { [version: string]: PackageVersion },
  readme?: string,
  maintainers?: {
    email: string,
    name: string
  }[],
  time?: { [key: string]: string },
  users?: { [key: string]: boolean },
  readmeFilename?: string,
  keywords?: string[],
  repository?: { type: string, url?: string },
  bugs?: { url: string },
  license?: string,
  homepage?: string,
}

type Index = { [name: string]: Package };

const extractorIterator = (extract: tar.Extract): AsyncIterable<[tar.Headers, stream.PassThrough]> => {
  let requestNext: () => void = () => {};
  const respondNexts: ((entry: IteratorResult<[tar.Headers, stream.PassThrough]> | undefined, err?: unknown) => void)[] = [];
  extract.on("entry", (headers, strm, next) => {
    requestNext = next;
    const respondNext = respondNexts.shift();
    if (respondNext) {
      respondNext({ value: [headers, strm] });
    }
  });
  extract.on("finish", () => {
    requestNext = () => { throw new Error("no entry anymore"); };
    while (respondNexts.length > 0) {
      const respondNext = respondNexts.shift();
      respondNext!({ done: true, value: undefined });
    }
  });
  extract.on("error", (error: unknown) => {
    requestNext = () => { throw new Error("no entry anymore"); };
    while (respondNexts.length > 0) {
      const respondNext = respondNexts.shift();
      respondNext!(undefined, error);
    }
  })
  const iter: AsyncIterator<[tar.Headers, stream.PassThrough]> = {
    next(): Promise<IteratorResult<[tar.Headers, stream.PassThrough]>> {
      return new Promise((resolve, reject) => {
        respondNexts.push((entry, err) => {
          if(entry) resolve(entry);
          else reject(err);
        });
        requestNext();
      });
    }
  };

  return {
    [Symbol.asyncIterator](): AsyncIterator<[tar.Headers, stream.PassThrough]> {
      return iter;
    }
  }
};

(async () => {
  const index: Index = {};

  const packagesDir = "./packages";

  for (const filename of await fs.promises.readdir(packagesDir)) {
    if (!filename.match(/\.tgz$/m)) {
      continue;
    }

    let packageJson: PackageJson | undefined;

    const extract = tar.extract();
    const iter: AsyncIterable<[tar.Headers, stream.PassThrough]> = extractorIterator(extract);
    fs.createReadStream(`${packagesDir}/${filename}`).pipe(zlib.createGunzip()).pipe(extract);
    for await (const [header, strm] of iter) {
      if (header.name === "package/package.json") {
        const chunks: Buffer[] = [];
        for await (const chunk of strm) {
          chunks.push(chunk);
        }
        const package_json_str = Buffer.concat(chunks).toString("utf8");
        const package_json_: unknown = JSON.parse(package_json_str);
        if (typeof(package_json_) === "object" && package_json_ != null) {
          packageJson = package_json_ as PackageJson;
        } else {
          throw new Error("package.json is a non-object");
        }
      } else {
        for await (const _ of strm) {}
      }
    }

    if (packageJson === undefined) {
      console.error(`${filename}: no package.json found`);
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
      }
    }
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
  })

  app.listen(port, () => {
    console.log(`Test registry listening at http://localhost:${port}`);
  });
})();
