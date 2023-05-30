// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import nodeResolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

/* TODO: "es" or "iife"?!
 *
 * https://rollupjs.org/configuration-options/#output-format
 */
const outputFormat = "es";

export default {
  input: "src/script/index.ts",
  output: [
    {
      file: "dist/assets/colorizer.js",
      format: outputFormat,
    },
    {
      file: "dist/assets/colorizer.min.js",
      format: outputFormat,
      plugins: [terser()],
    },
  ],
  plugins: [typescript(), nodeResolve()],
};
