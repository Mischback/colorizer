// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { roundToPrecision } from "../../utility";
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

  /**
   * Create a ``ColorizerColor`` instance from RGB values in range [0..255].
   *
   * @param red The red component in range [0..255].
   * @param green The green component in range [0..255].
   * @param blue The blue component in range [0..255].
   * @returns ``ColorizerColor`` instance.
   *
   * The function sanitizes the arguments by converting them to integers
   * (meaning: numbers without decimal places) and keeps them in the
   * required range of [0..255] (values below 0 are set to 0, values above
   * 255 are set to 255).
   *
   * Internally it uses ``ColorizerColor.fromRgb()`` to create the class
   * instance.
   */
  public static fromRgb255(red: number, green: number, blue: number) {
    console.debug(`RAW: red: ${red}, green: ${green}, blue: ${blue}`);

    // Ensure we have integers
    red = roundToPrecision(red, 0);
    green = roundToPrecision(green, 0);
    blue = roundToPrecision(blue, 0);

    // Sanitize user input!
    if (red < 0) red = 0;
    if (red > 255) red = 255;
    if (green < 0) green = 0;
    if (green > 255) green = 255;
    if (blue < 0) blue = 0;
    if (blue > 255) blue = 255;

    return ColorizerColor.fromRgb(red / 255, green / 255, blue / 255);
  }
}
