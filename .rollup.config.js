// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

/* Determine if we're running in *development mode*.
 *
 * See the ``Makefile`` for the value of the *development flag*.
 */
const devMode = process.env.DEV_FLAG === "dev";

/* The default output filename.
 *
 * This will be the minimized script file, meaning the ``terser`` plugin is
 * applied to the file.
 */
const outputMainFile = "dist/assets/colorizer.js";

/* TODO: "es" or "iife"?!
 *
 * https://rollupjs.org/configuration-options/#output-format
 */
const outputFormat = "es";

/* The default output format.
 *
 * This is the minimized script file, meaning the ``terser`` plugin is applied
 * to the file.
 */
const outputDefault = {
  file: outputMainFile,
  format: outputFormat,
  plugins: [terser()],
};

/* In *development mode* a **maximized** version is generated, where the
 * ``terser`` plugin is not applied to the file.
 */
let outputConfig = {};
if (devMode === true) {
  outputConfig = [
    outputDefault,
    {
      file: "dist/assets/colorizer.max.js",
      format: outputFormat,
    },
  ];
} else {
  outputConfig = outputDefault;
}

export default {
  input: "src/script/index.ts",
  output: outputConfig,
  plugins: [typescript(), nodeResolve()],
};
