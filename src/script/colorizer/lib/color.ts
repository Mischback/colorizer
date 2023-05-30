// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { roundToPrecision } from "../../utility";
import {
  convertGammaRgbToXyz,
  convertOklchToXyz,
  convertXyzToGammaRgb,
  convertXyzToOklch,
} from "../../utility/color-processing";
import type { TOklch, TRgb, TXyz } from "../../utility/color-processing";

/**
 * Force a ``value`` into a range specified by ``lower`` and ``upper``.
 *
 * @param val The input value.
 * @param lower The lower bound of the accepted range.
 * @param upper The upper bound of the accepted range.
 *
 * If ``val`` is ``NaN``, ``lower`` is returned.
 */
function forceValueIntoRange(
  val: number,
  lower: number,
  upper: number
): number {
  if (Number.isNaN(val) || val < lower) return lower;
  if (val > upper) return upper;
  return val;
}

export class ColorizerColor {
  private x: number;
  private y: number;
  private z: number;

  private constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Get the color in CIE XYZ mode.
   *
   * @returns An ``object`` literal with ``x``, ``y`` and ``z`` attributes,
   *          provided in range [0..1].
   *
   * This returns the internally stored XYZ coordinates.
   *
   * TODO: Verify the range [0..1] for the ``x``, ``y`` and ``z`` attributes!
   */
  public toJSON(): TXyz {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
    };
  }

  /**
   * Get the color in gamma-corrected sRGB mode.
   *
   * @returns An ``object`` literal with ``r``, ``g`` and ``b`` attributes,
   *          provided in range [0..1].
   *
   * Please note: Internally the color is converted from CIE XYZ to
   * (gamma-corrected) sRGB **and** the values are **not rounded**.
   */
  public toRgb(): TRgb {
    return convertXyzToGammaRgb(this.toJSON());
  }

  /**
   * Get the color in gamma-corrected sRGB mode.
   *
   * @returns An ``object`` literal with ``r``, ``g`` and ``b`` attributes,
   *          provided in range [0..255].
   *
   * Please note: Internally the color is converted from CIE XYZ to
   * (gamma-corrected) sRGB **and** the values are **rounded** to *integers*.
   */
  public toRgb255(): TRgb {
    const tmp = this.toRgb();

    return {
      r: roundToPrecision(tmp.r * 255, 0),
      g: roundToPrecision(tmp.g * 255, 0),
      b: roundToPrecision(tmp.b * 255, 0),
    };
  }

  public toOklch(): TOklch {
    return convertXyzToOklch(this.toJSON());
  }

  /**
   * Create a ``ColorizerColor`` instance from RGB values in range [0..1].
   *
   * @param red The red component in range [0..1].
   * @param green The green component in range [0..1].
   * @param blue The blue component in range [0..1].
   * @returns ``ColorizerColor`` instance.
   *
   * The function sanitizes the arguments by forcing red, green and blue into
   * the accepted range of [0..1]. If ``NaN`` is provided for any of the
   * arguments, it is set to ``0``. No rounding is applied while creating the
   * instance. The interface may apply rounding when the values are displayed.
   */
  public static fromRgb(red: number, green: number, blue: number) {
    const xyz = convertGammaRgbToXyz({
      r: forceValueIntoRange(red, 0, 1),
      g: forceValueIntoRange(green, 0, 1),
      b: forceValueIntoRange(blue, 0, 1),
    });
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
   * (meaning: numbers without decimal places). If the value exceeds the
   * accepted range of [0..255], this is sanitized by
   * ``ColorizerColor.fromRgb()``, which handles the instantiation internally.
   */
  public static fromRgb255(red: number, green: number, blue: number) {
    // Ensure we have integers
    red = roundToPrecision(red, 0);
    green = roundToPrecision(green, 0);
    blue = roundToPrecision(blue, 0);

    return ColorizerColor.fromRgb(red / 255, green / 255, blue / 255);
  }

  /**
   * Create a ``ColorizerColor`` instance from Oklch input.
   *
   * @param lightness The (perceived) lightness in range [0..1].
   * @param chroma The chroma in range [0..1].
   * @param hue The hue (in range [0..360]; this is not enforced, but
   *            effectively ensured by the internal conversion functions in
   *            ``utility/color-processing.ts``).
   * @returns ``ColorizerColor`` instance.
   *
   * The function sanitizes the arguments by forcing lightness and chroma into
   * the accepted range of [0..1]. If ``NaN`` is provided for any of the
   * arguments, it is set to ``0``. No rounding is applied while creating the
   * instance. The interface may apply rounding when the values are displayed.
   */
  public static fromOklch(lightness: number, chroma: number, hue: number) {
    // Note: The conversion functions will handle ``hue`` and make sure to keep
    //       it in range [0..360].
    if (Number.isNaN(hue)) hue = 0;

    const xyz = convertOklchToXyz({
      l: forceValueIntoRange(lightness, 0, 1),
      c: forceValueIntoRange(chroma, 0, 1),
      h: hue,
    });
    return new ColorizerColor(xyz.x, xyz.y, xyz.z);
  }
}
