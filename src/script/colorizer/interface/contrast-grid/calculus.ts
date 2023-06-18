// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

export function luminanceFromRgb(red: number, green: number, blue: number) {
  // @ts-expect-error TS2322
  const a: [number, number, number] = [red, green, blue].map(function (v) {
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

/**
 * Determine the contrast between two colors based on their relative luminance.
 *
 * @param c1_luminance Relative luminance of first color.
 * @param c2_luminance Relative luminance of second color.
 * @returns The contrast ratio, a value between [1..21].
 *
 * The *common notation* of contrast values is something like ``6.1:1``. This
 * function would return ``6.1`` in that case.
 *
 * The formula is taken from
 * https://www.w3.org/TR/WCAG20/#contrast-ratiodef.
 */
export function getContrastValue(
  c1_luminance: number,
  c2_luminance: number
): number {
  const brighter = Math.max(c1_luminance, c2_luminance);
  const darker = Math.min(c1_luminance, c2_luminance);
  return (brighter + 0.05) / (darker + 0.05);
}

/**
 * Map a given contrast value to its W3C category.
 *
 * @param contrastValue A contrast value as number, most likely a ``float``.
 * @returns One of ``AAA``, ``AA``, ``A`` or ``FAIL``.
 *
 * The classification is based on
 * https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast-contrast.html
 */
export function getWcagCat(contrastValue: number): string {
  switch (true) {
    case contrastValue >= 7:
      return "AAA";
    case contrastValue >= 4.5:
      return "AA";
    case contrastValue >= 3:
      return "A";
    default:
      return "FAIL";
  }
}
