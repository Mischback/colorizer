// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerPalette } from "./palette";
import { ColorizerDatabase } from "./database";
import { ColorizerForm } from "../interface/color-form";
import { ColorizerContrastGrid } from "../interface/contrast-grid/grid";
import { ColorizerPaletteIO } from "../interface/palette";
import { NotificationEngine } from "../../utility";
import type { TColorizerFormInputMethod } from "../interface/color-form";
import type { TColorizerPaletteItemNotation } from "../interface/palette";

export class ColorizerController {
  private db: ColorizerDatabase;
  // @ts-expect-error TS6133 value never read
  private form: ColorizerForm;
  private grid: ColorizerContrastGrid;
  private notificationEngine: NotificationEngine;
  private palette: ColorizerPalette;
  private paletteIO: ColorizerPaletteIO;

  public constructor(
    // inputMethods: TColorizerFormInputMethod[] = ["rgb", "hsl", "hwb", "oklch"],
    inputMethods: TColorizerFormInputMethod[] = ["rgb", "hsl"],
    outputNotations: TColorizerPaletteItemNotation[] = [
      "rgb",
      "rgb-hex",
      "hsl",
      "hwb",
      "oklch",
      "xyz",
    ]
  ) {
    // Setup the notification interface
    this.notificationEngine = new NotificationEngine(
      document.getElementById("notifications")
    );

    // Setup the app-specific IndexedDB wrapper
    this.db = new ColorizerDatabase();

    // Setup the palette.
    //
    // This is the *engine* that manages the palette internally. For the actual
    // visualization in the frontend, see ``this.paletteInterface`` below.
    this.palette = new ColorizerPalette(this.db, this.notificationEngine);

    // Setup the ColorizerForm to add colors
    //
    // The ``ColorizerPalette`` instance provides the ``submitCallback``
    // function to actually process new colors.
    this.form = new ColorizerForm(
      inputMethods,
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.palette.addColorToPalette.bind(this.palette)
    );

    // Setup the palette interface.
    //
    // This is directly attached to the ``ColorizerPalette`` instance, which
    // provides the actual data management methods (CRUD operations).
    this.paletteIO = new ColorizerPaletteIO(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.palette.moveItemInPalette.bind(this.palette),
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.palette.removePaletteItemById.bind(this.palette),
      outputNotations
    );
    this.palette.addPaletteObserver(this.paletteIO);

    this.grid = new ColorizerContrastGrid(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      this.palette.moveItemInPalette.bind(this.palette)
    );
    this.palette.addPaletteObserver(this.grid);
  }
}
