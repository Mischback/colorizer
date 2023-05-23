// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { convertGammaRgbToXyz } from "../../utility/color-processing";

export class ColorizerColor {
  private x: number;
  private y: number;
  private z: number;

  private constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  public toJSON() {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
    };
  }

  /**
   * Create a ``ColorizerColor`` instance from RGB values in range [0..1].
   *
   * @param red The red component in range [0..1].
   * @param green The green component in range [0..1].
   * @param blue The blue component in range [0..1].
   * @returns ``ColorizerColor`` instance.
   *
   * The method does check the input values and throws ``Error`` instances
   * if they exceed the expected range.
   */
  public static fromRgb(red: number, green: number, blue: number) {
    console.debug(`red: ${red}, green: ${green}, blue: ${blue}`);

    // Sanitize user input!
    if (!(0 <= red && red <= 1)) {
      throw new Error(`Value exceeds accepted range [0..1]: ${red}`);
    }
    if (!(0 <= green && green <= 1)) {
      throw new Error(`Value exceeds accepted range [0..1]: ${green}`);
    }
    if (!(0 <= blue && blue <= 1)) {
      throw new Error(`Value exceeds accepted range [0..1]: ${blue}`);
    }

    const xyz = convertGammaRgbToXyz({ r: red, g: green, b: blue });
    return new ColorizerColor(xyz.x, xyz.y, xyz.z);
  }
}
