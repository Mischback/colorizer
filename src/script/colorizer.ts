// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerController } from "./colorizer/engine/controller";

document.addEventListener("DOMContentLoaded", () => {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // @ts-expect-error TS6133 value never read
  const colorizerController = new ColorizerController();
  /* eslint-enable @typescript-eslint/no-unused-vars */
});
