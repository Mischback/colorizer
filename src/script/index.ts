// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getColorFormInput } from "./colorizer/interface/color_form/input_methods";

document.addEventListener("DOMContentLoaded", () => {
  const a = getColorFormInput("rgb");
  console.log(a);
  a.getColor();
});
