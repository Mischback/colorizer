// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorForm } from "./colorizer/interface/color-form/form";

document.addEventListener("DOMContentLoaded", () => {
  const form = new ColorForm(["rgb"], (color) => {
    console.log("ColorForm submitted!");

    const raw = color.toJSON();
    console.log(`  Raw: { x: ${raw.x}, y: ${raw.y}, z: ${raw.z} }`);

    const rgb = color.toRgb255();
    console.log(`  RGB: { r: ${rgb.r}, g: ${rgb.g}, b: ${rgb.b} }`);
  });
  console.debug(form);
});
