import * as gulp from "gulp";

import { processRamlFile } from "./src/utils/parser";
import { createClient, createDto, createIndex } from "./src/utils/renderer";

import log from "fancy-log";

import del from "del";
import fs from "fs-extra";
import ts from "gulp-typescript";

import {
  WebApiBaseUnit,
  WebApiBaseUnitWithEncodesModel,
  WebApiBaseUnitWithDeclaresModel
} from "webapi-parser";
import { TypeRenderer } from "./src/utils/type-renderer";

import { RELEASES, SDK_DIR_TS, SDK_DIR_JS } from "./src/utils/config";

const tsProject = ts.createProject("tsconfig.json");
const files = [
  {
    boundedContext: "shop",
    ramlFile: "/raml/shop/site.raml"
  }
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
gulp.task("cleanTs", (cb: any) => {
  log.info(`Removing ${RELEASES}/${SDK_DIR_TS} directory`);
  return del([`${RELEASES}/${SDK_DIR_TS}`], cb);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
gulp.task("cleanJs", (cb: any) => {
  log.info(`Removing 'dist' directory`);
  return del([`${RELEASES}/${SDK_DIR_JS}`], cb);
});

gulp.task("clean", gulp.parallel("cleanTs", "cleanJs"));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function copyCore(cb: any): any {
  gulp
    .src("./src/core/**/*")
    .pipe(gulp.dest(`${RELEASES}/${SDK_DIR_TS}/core`))
    .on("end", function() {
      cb();
    });
}

gulp.task(
  "renderTemplates",
  gulp.series(
    "cleanTs",
    async () => {
      const files = [
        {
          boundedContext: "shop",
          ramlFile: `${__dirname}/raml/shop/site.raml`
        }
      ];

      await fs.ensureDir(`${RELEASES}/${SDK_DIR_TS}`);

      for (const entry of files) {
        await processRamlFile(entry.ramlFile)
          .then((res: WebApiBaseUnit) => {
            fs.writeFileSync(
              `${RELEASES}/${SDK_DIR_TS}/${entry.boundedContext}.ts`,
              createClient((res as WebApiBaseUnitWithEncodesModel).encodes)
            );
          })
          .catch(err => {
            console.log(err);
          });
      }

      fs.writeFileSync(
        `${RELEASES}/${SDK_DIR_TS}/index.ts`,
        createIndex(files)
      );
    },
    copyCore
  )
);

gulp.task("renderTypes", async () => {
  const typeRenderer = new TypeRenderer(__dirname);
  await typeRenderer.process(files);
});

gulp.task(
  "cleanAndRenderTypes",
  gulp.series("cleanTs", async () => {
    const typeRenderer = new TypeRenderer(__dirname);
    await typeRenderer.process(files);
  })
);
gulp.task(
  "buildSdk",
  gulp.series("cleanJs", function(cb) {
    tsProject
      .src()
      .pipe(tsProject())
      .js.pipe(gulp.dest(`${RELEASES}/${SDK_DIR_JS}`))
      .on("end", function() {
        cb();
      });
  })
);

gulp.task("default", gulp.series("renderTemplates", "renderTypes", "buildSdk"));