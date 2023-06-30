// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerController } from "./colorizer/engine/controller";
import { TabbedInterface } from "./utility";

document.addEventListener("DOMContentLoaded", () => {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // @ts-expect-error TS6133 value never read
  const colorizerController = new ColorizerController();

  // @ts-expect-error TS6133 value never read
  const rootTabs = new TabbedInterface(document.getElementById("tabs-root"));
  /* eslint-enable @typescript-eslint/no-unused-vars */
});
