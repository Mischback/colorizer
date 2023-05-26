// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerForm } from "./colorizer/interface/color-form";

document.addEventListener("DOMContentLoaded", () => {
  const form = new ColorizerForm(["rgb"], (color) => {
    console.log("ColorizerForm submitted!");

    const raw = color.toJSON();
    console.log(`  Raw: { x: ${raw.x}, y: ${raw.y}, z: ${raw.z} }`);

    const rgb = color.toRgb255();
    console.log(`  RGB: { r: ${rgb.r}, g: ${rgb.g}, b: ${rgb.b} }`);
  });
  console.debug(form);
});
