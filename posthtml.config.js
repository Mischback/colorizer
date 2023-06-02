// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

const config = {
  plugins: {
    "posthtml-hash": {
      path: "dist",
      pattern: new RegExp(/\[BUSTING\]/),
      hashLength: 8,
    },
  },
};

module.exports = config;
