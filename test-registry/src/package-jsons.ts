import fs = require("fs");
import stream = require("stream");
import zlib = require("zlib");
import tar = require("tar-stream");

export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  private?: boolean;
  files?: string[];
  scripts: { [script: string]: string };
  keywords?: string[];
  author?: string;
  license?: string;
  repository?: { type: "git"; url: string };
  dependencies?: { [name: string]: string };
  devDependencies?: { [name: string]: string };
  optionalDependencies?: { [name: string]: string };
  peerDependencies?: { [name: string]: string };
  bundledDependencies?: { [name: string]: string };
}

const extractorIterator = (
  extract: tar.Extract
): AsyncIterable<[tar.Headers, stream.PassThrough]> => {
  let requestNext: () => void = () => {
    // Do nothing
  };
  const respondNexts: ((
    entry: IteratorResult<[tar.Headers, stream.PassThrough]> | undefined,
    err?: unknown
  ) => void)[] = [];
  extract.on("entry", (headers, strm, next) => {
    requestNext = next;
    const respondNext = respondNexts.shift();
    if (respondNext) {
      respondNext({ value: [headers, strm] });
    }
  });
  extract.on("finish", () => {
    requestNext = () => {
      throw new Error("no entry anymore");
    };
    while (respondNexts.length > 0) {
      const respondNext = respondNexts.shift();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      respondNext!({ done: true, value: undefined });
    }
  });
  extract.on("error", (error: unknown) => {
    requestNext = () => {
      throw new Error("no entry anymore");
    };
    while (respondNexts.length > 0) {
      const respondNext = respondNexts.shift();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      respondNext!(undefined, error);
    }
  });
  const iter: AsyncIterator<[tar.Headers, stream.PassThrough]> = {
    next(): Promise<IteratorResult<[tar.Headers, stream.PassThrough]>> {
      return new Promise((resolve, reject) => {
        respondNexts.push((entry, err) => {
          if (entry) resolve(entry);
          else reject(err);
        });
        requestNext();
      });
    },
  };

  return {
    [Symbol.asyncIterator](): AsyncIterator<[tar.Headers, stream.PassThrough]> {
      return iter;
    },
  };
};

export const extractPackageJson = async (
  path: string
): Promise<PackageJson> => {
  let packageJson: PackageJson | undefined;

  const extract = tar.extract();
  const iter: AsyncIterable<[
    tar.Headers,
    stream.PassThrough
  ]> = extractorIterator(extract);
  fs.createReadStream(path).pipe(zlib.createGunzip()).pipe(extract);
  for await (const [header, strm] of iter) {
    if (header.name === "package/package.json") {
      const chunks: Buffer[] = [];
      for await (const chunk of strm) {
        chunks.push(chunk);
      }
      const package_json_str = Buffer.concat(chunks).toString("utf8");
      const package_json_: unknown = JSON.parse(package_json_str);
      if (typeof package_json_ === "object" && package_json_ != null) {
        packageJson = package_json_ as PackageJson;
      } else {
        throw new Error(`${path}: package.json is a non-object`);
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of strm) {
        // Drop all chunks
      }
    }
  }

  if (packageJson === undefined) {
    throw new Error(`${path}: no package.json found`);
  }
  return packageJson;
};
