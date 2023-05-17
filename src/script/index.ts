// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getDomElement } from "./utility";

document.addEventListener("DOMContentLoaded", () => {
  console.log(getDomElement(null, "body"));
});
