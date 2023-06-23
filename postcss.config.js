// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE
//

/**
 * Configuration for ``PostCSS``.
 *
 * The SCSS sources are transpiled using ``sass`` and the result is then
 * post-processed with PostCSS.
 */

const purgecss = require("@fullhuman/postcss-purgecss")({
  content: ["./**/*.html"],
  fontFace: true,
  keyFrames: true,
  variables: true,
  safelist: ["message"],
  blocklist: [],
});

/* Determine if we're running in *development mode*.
 *
 * See the ``Makefile`` for the value of the *development flag*.
 */
const devMode = process.env.DEV_FLAG === "dev";

/* The default output format.
 *
 * *development mode* will skip all optimisation plugins.
 */
const config = {
  plugins: [purgecss, require("autoprefixer")(), require("cssnano")()],
};

if (devMode === true) {
  config.plugins = [purgecss];
}

module.exports = config;
