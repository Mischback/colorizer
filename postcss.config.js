// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

const purgecss = require("@fullhuman/postcss-purgecss");
const purgecssConfig = {
  content: ["./**/*.html"],
  fontFace: true,
  keyFrames: true,
  variables: true,
  // safelist: [],
  blocklist: [],
};

/* Determine if we're running in *development mode*.
 *
 * See the ``Makefile`` for the value of the *development flag*.
 */
const devMode = process.env.DEV_FLAG === "dev";

/* The default output format.
 *
 * *development mode* will skip all optimisation plugins.
 */
const outputConfig = {
  plugins: [
    purgecss(purgecssConfig),
    require("autoprefixer")(),
    require("cssnano")(),
  ],
};

if (devMode === true) {
  outputConfig.plugins = [purgecss(purgecssConfig)];
}

module.exports = outputConfig;
