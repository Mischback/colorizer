// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

/**
 * Configuration for ``Rollup``.
 *
 * ``Rollup`` is only used to *bundle* the script files. It does not create
 * *the whole bundle*, including other static assets (e.g. stylesheets, ...).
 *
 * The overall build process is driven by ``make`` and there are dedicated
 * recipes to transpile / post-process the other assets.
 *
 * This configuration deliberately omits specifying the ``input`` file(s) and
 * the desired output location. These parameters should be provided by command
 * line arguments (``--input``/``-i`` and ``--file``/``-o`` or
 * ``--dir``/``-d``).
 *
 * References:
 * - https://rollupjs.org/configuration-options/#input
 * - https://rollupjs.org/configuration-options/#output-dir
 * - https://rollupjs.org/configuration-options/#output-file
 */

// import nodeResolve from "@rollup/plugin-node-resolve";  // Not in use as of now!
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

/* Determine if we're running in *development mode*.
 *
 * See the ``Makefile`` for the value of the *development flag*.
 */
const devMode = process.env.DEV_FLAG === "dev";

/* TODO: "es" or "iife"?!
 *
 * https://rollupjs.org/configuration-options/#output-format
 */
const outputFormat = "es";

const config = {
  output: {
    assetFileNames: "[name][extname]",
    format: outputFormat,
  },
  plugins: [typescript()],
};

if (devMode === true) {
  // FIXME: Make sourcemaps actually work
  //        Desired: Show references to the actual TS sources!
  //        Ref: https://stackoverflow.com/questions/63218218/rollup-is-not-generating-typescript-sourcemap
  config.output.sourcemap = true;
  config.output.validate = true; // highly experimental
} else {
  config.output.plugins = [terser()];
}

export default config;
