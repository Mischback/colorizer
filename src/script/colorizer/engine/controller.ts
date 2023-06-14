// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerPalette } from "./palette";
import { ColorizerDatabase } from "./database";
import { ColorizerForm } from "../interface/color-form";
import { ColorizerPaletteInterface } from "../interface/palette";
import type { TColorizerFormInputMethod } from "../interface/color-form";

export class ColorizerController {
  private db: ColorizerDatabase;
  // @ts-expect-error TS6133 value never read
  private form: ColorizerForm;
  private palette: ColorizerPalette;
  // @ts-expect-error TS6133 value never read
  private paletteInterface: ColorizerPaletteInterface;

  public constructor(
    inputMethods: TColorizerFormInputMethod[] = ["rgb", "hsl", "hwb", "oklch"]
  ) {
    // Setup the app-specific IndexedDB wrapper
    this.db = new ColorizerDatabase();

    // Setup the palette.
    //
    // This is the *engine* that manages the palette internally. For the actual
    // visualization in the frontend, see ``this.paletteInterface`` below.
    this.palette = new ColorizerPalette(this.db);

    // Setup the ColorizerForm to add colors
    //
    // The ``ColorizerPalette`` instance provides the ``submitCallback``
    // function to actually process new colors.
    this.form = new ColorizerForm(
      inputMethods,
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.palette.addPaletteItem.bind(this.palette)
    );

    // Setup the palette interface.
    //
    // This is directly attached to the ``ColorizerPalette`` instance, which
    // provides the actual data management methods (CRUD operations).
    this.paletteInterface = new ColorizerPaletteInterface(this.palette);
  }
}
