// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { luminanceFromRgb } from "./calculus";
import { roundToPrecision } from "../../../utility";
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
    // FIXME: The current code is meant to research #34!
    palette.forEach((item) => {
      console.log(item);
      const rgb = item.color.toRgb();
      const xyz = item.color.toJSON();
      const luminanceCalc = luminanceFromRgb(rgb.r, rgb.g, rgb.b);

      console.log(
        `calc: ${luminanceCalc}; Y: ${xyz.y}; diff: ${roundToPrecision(
          Math.abs(luminanceCalc - xyz.y),
          3
        )}`
      );
    });
  }
}
