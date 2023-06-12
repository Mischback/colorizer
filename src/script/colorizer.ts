// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerController } from "./colorizer/engine/controller";

document.addEventListener("DOMContentLoaded", () => {
  // @ts-expect-error TS6133 value never read
  const colorizerController = new ColorizerController();
});
