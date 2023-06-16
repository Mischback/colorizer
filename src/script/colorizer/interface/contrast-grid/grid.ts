// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import type {
  ColorizerPalette,
  ColorizerPaletteItem,
} from "../../engine/palette";
import type { IColorizerPaletteObserver } from "../../lib/types";

export class ColorizerContrastGrid implements IColorizerPaletteObserver {
  private palette: ColorizerPalette;

  public constructor(palette: ColorizerPalette) {
    // Store a reference to the ``ColorizerPalette`` instance and register
    // this instance as an *Observer*.
    this.palette = palette;
    this.palette.addPaletteObserver(this);
  }

  /**
   * Perform actions on palette updates.
   *
   * @param palette The updated/changed palette.
   *
   * This is part of the implementation of the Observer pattern. This class
   * acts as an *Observer* to the ``ColorizerPalette`` *Observable*.
   */
  public update(palette: ColorizerPaletteItem[]): void {
    palette.forEach((item) => {
      console.log(item);
    });
  }
}
