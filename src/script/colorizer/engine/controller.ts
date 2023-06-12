// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerPalette } from "./palette";
import { ColorizerForm } from "../interface/color-form";
import { ColorizerPaletteInterface } from "../interface/palette";
import type { TColorizerFormInputMethod } from "../interface/color-form";

export class ColorizerController {
  // @ts-expect-error TS6133 value never read
  private form: ColorizerForm;
  private palette: ColorizerPalette;
  // @ts-expect-error TS6133 value never read
  private paletteInterface: ColorizerPaletteInterface;

  public constructor(
    inputMethods: TColorizerFormInputMethod[] = ["rgb", "hsl", "hwb", "oklch"]
  ) {
    this.palette = new ColorizerPalette();

    // Setup the ColorizerForm to add colors
    //
    // The ``ColorizerPalette`` instance provides the ``submitCallback``
    // function to actually process new colors.
    this.form = new ColorizerForm(
      inputMethods,
      this.palette.addPaletteItem.bind(this.palette)
    );

    // Setup the palette interface.
    //
    // This is directly attached to the ``ColorizerPalette`` instance, which
    // provides the actual data management methods (CRUD operations).
    this.paletteInterface = new ColorizerPaletteInterface(this.palette);
  }
}
