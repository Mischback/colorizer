// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerPalette } from "./palette";
import { ColorizerForm } from "../interface/color-form";
import type { TColorizerFormInputMethod } from "../interface/color-form";

export class ColorizerController {
  private palette: ColorizerPalette;
  // @ts-expect-error TS6133 value never read
  private form: ColorizerForm;

  public constructor(
    inputMethods: TColorizerFormInputMethod[] = ["rgb", "hsl", "hwb", "oklch"]
  ) {
    this.palette = new ColorizerPalette();
    this.form = new ColorizerForm(
      inputMethods,
      this.palette.addPaletteItem.bind(this.palette)
    );
  }
}
