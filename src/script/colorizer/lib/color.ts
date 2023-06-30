// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { roundToPrecision } from "../../utility";
import {
  convertGammaRgbToXyz,
  convertHslToXyz,
  convertHwbToXyz,
  convertOklchToXyz,
  convertXyzToGammaRgb,
  convertXyzToHsl,
  convertXyzToHwb,
  convertXyzToOklch,
} from "../../utility/color-processing";
import type {
  THsl,
  THwb,
  TOklch,
  TRgb,
  TXyz,
} from "../../utility/color-processing";

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

/**
 * The internal representation of colors in the application.
 *
 * Internally, the class uses the **CIE XYZ** colorspace with **D65** as
 * reference white to manage colors.
 *
 * Instances may be created by different (``static``) functions from different
 * color spaces, following their respective semantic mechanics. They are
 * converted to *CIE XYZ D65* by functions of the ``utility/color-processing``
 * module.
 */
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
   * @returns An ``object`` literal with ``x``, ``y`` and ``z`` attributes.
   *          The ranges of the ``x``, ``y`` and ``z`` attributes are not
   *          restrained, but should be *roughly* in the following ranges:
   *          - ``x``: [0..0.96]
   *          - ``y``: [0..1]
   *          - ``z``: [0..1.09]
   *
   * This returns the internally stored XYZ coordinates.
   *
   * References:
   * - https://en.wikipedia.org/wiki/CIE_1931_color_space
   * - https://medium.com/hipster-color-science/a-beginners-guide-to-colorimetry-401f1830b65a
   * - https://www.sttmedia.com/colormodel-xyz
   */
  public toJSON(): TXyz {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
    };
  }

  public toXyzString() {
    return {
      x: roundToPrecision(this.x, 3).toString(),
      y: roundToPrecision(this.y, 3).toString(),
      z: roundToPrecision(this.z, 3).toString(),
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

  /**
   * Get the color in Oklch mode.
   *
   * @returns An ``object`` literal with ``l``, ``c`` and ``h`` attributes,
   *          where ``l`` and ``c`` are in range [0..1] and ``h`` in range
   *          [0..360].
   *
   * Please note: Internally the color is converted from CIE XYZ to Oklch
   * **and** the values are **not rounded**.
   */
  public toOklch(): TOklch {
    return convertXyzToOklch(this.toJSON());
  }

  public toOklchString() {
    const tmp = this.toOklch();

    return {
      l: roundToPrecision(tmp.l * 100, 2).toString(),
      c: roundToPrecision((tmp.c / 0.4) * 100, 2).toString(),
      h: roundToPrecision(tmp.h, 2).toString(),
    };
  }

  /**
   * Get the color in HSL notation of sRGB.
   *
   * @returns An ``object`` literal with ``h`` attribute in range [0..360] and
   *          ``s`` and ``l`` attributes in range [0..1].
   *
   * Please note: Internally the color is converted from CIE XYZ to HSL sRGB
   * notation **and** the values are **not rounded**.
   */
  public toHsl(): THsl {
    return convertXyzToHsl(this.toJSON());
  }

  public toHslString() {
    const tmp = this.toHsl();

    return {
      h: roundToPrecision(tmp.h, 2).toString(),
      s: roundToPrecision(tmp.s * 100, 2).toString(),
      l: roundToPrecision(tmp.l * 100, 2).toString(),
    };
  }

  /**
   * Get the color in HWB notation of sRGB.
   *
   * @returns An ``object`` literal with ``h`` attribute in range [0..360] and
   *          ``w`` and ``b`` attributes in range [0..1].
   *
   * Please note: Internally the color is converted from CIE XYZ to HWB sRGB
   * notation **and** the values are **not rounded**.
   */
  public toHwb(): THwb {
    return convertXyzToHwb(this.toJSON());
  }

  public toHwbString() {
    const tmp = this.toHwb();

    return {
      h: roundToPrecision(tmp.h, 2).toString(),
      w: roundToPrecision(tmp.w * 100, 2).toString(),
      b: roundToPrecision(tmp.b * 100, 2).toString(),
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

  /**
   * Create a ``ColorizerColor`` instance from HSL input.
   *
   * @param hue The hue (in range [0..360]; this is not enforced, but
   *            effectively ensured by the internal conversion functions in
   *            ``utility/color-processing.ts``).
   * @param saturation The saturarion in range [0..1].
   * @param light The light in range [0..1].
   * @returns ``ColorizerColor`` instance.
   *
   * The function sanitizes the arguments by forcing light and saturation into
   * the accepted range of [0..1]. If ``NaN`` is provided for any of the
   * arguments, it is set to ``0``. No rounding is applied while creating the
   * instance. The interface may apply rounding when the values are displayed.
   */
  public static fromHsl(hue: number, saturation: number, light: number) {
    // Note: The conversion functions will handle ``hue`` and make sure to keep
    //       it in range [0..360].
    if (Number.isNaN(hue)) hue = 0;

    const xyz = convertHslToXyz({
      h: hue,
      s: forceValueIntoRange(saturation, 0, 1),
      l: forceValueIntoRange(light, 0, 1),
    });
    return new ColorizerColor(xyz.x, xyz.y, xyz.z);
  }

  /**
   * Create a ``ColorizerColor`` instance from HWB input.
   *
   * @param hue The hue (in range [0..360]; this is not enforced, but
   *            effectively ensured by the internal conversion functions in
   *            ``utility/color-processing.ts``).
   * @param white The white component in range [0..1].
   * @param black The black component in range [0..1].
   * @returns ``ColorizerColor`` instance.
   *
   * The function sanitizes the arguments by forcing white and black into
   * the accepted range of [0..1]. If ``NaN`` is provided for any of the
   * arguments, it is set to ``0``. No rounding is applied while creating the
   * instance. The interface may apply rounding when the values are displayed.
   */
  public static fromHwb(hue: number, white: number, black: number) {
    // Note: The conversion functions will handle ``hue`` and make sure to keep
    //       it in range [0..360].
    if (Number.isNaN(hue)) hue = 0;

    const xyz = convertHwbToXyz({
      h: hue,
      w: forceValueIntoRange(white, 0, 1),
      b: forceValueIntoRange(black, 0, 1),
    });
    return new ColorizerColor(xyz.x, xyz.y, xyz.z);
  }

  /**
   * Create a ``ColorizerColor`` instance from XYZ input.
   *
   * @param x The X coordinate.
   * @param y The Y coordinate.
   * @param z The Z coordinate.
   * @returns ``ColorizerColor`` instance.
   *
   * This is the most raw method to create instances and meant to be used
   * internally only (e.g. after fetching *flat JSON data* from the database).
   */
  public static fromXyz(x: number, y: number, z: number) {
    return new ColorizerColor(x, y, z);
  }
}
