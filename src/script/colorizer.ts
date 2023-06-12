// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerForm } from "./colorizer/interface/color-form";
import { ColorizerPalette } from "./colorizer/engine/palette";

document.addEventListener("DOMContentLoaded", () => {
  const palette = new ColorizerPalette();
  console.debug(palette);

  const form = new ColorizerForm(
    ["rgb", "hsl", "hwb", "oklch"],
    palette.addPaletteItem.bind(palette)
  );
  console.debug(form);
});
