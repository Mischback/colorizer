// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getColorFormInput } from "./colorizer/interface/color-form/input-methods";

document.addEventListener("DOMContentLoaded", () => {
  const a = getColorFormInput("rgb");
  console.log(a);
  a.getColor();
});
