// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

type TVector = number[]; // an Array of numbers
type TMatrix = TVector[]; // basically this is ``number[][]``, an Array of Arrays of numbers
type TColorCoordinates = [number, number, number]; // Colors are represented by three coordinates. This is an internal thing to ensure array access
export type TOklab = { l: number; a: number; b: number };
export type TOklch = { l: number; c: number; h: number };
export type TRgb = { r: number; g: number; b: number };
type TLinRgb = { r: number; g: number; b: number };
export type TXyz = { x: number; y: number; z: number };

/**
 * Multiply two matrices.
 *
 * @param A First matrix, assumed to be *m x n*.
 * @param B Second matrix, assumed to be *n x p*.
 * @returns The product, should be *m x p*.
 * @author Lea Verou 2020 MIT License
 *
 * This implementation is fetched from
 * https://www.w3.org/TR/css-color-4/multiply-matrices.js (which is provided by
 * Lea Verou under MIT license) and complemented with type information.
 */
function multiplyMatrices(
  A: TVector | TMatrix,
  B: TVector | TMatrix
): TVector | TMatrix {
  const m = A.length;

  if (!Array.isArray(A[0])) {
    // A is vector, convert to [[a, b, c, ...]]
    A = <TMatrix>[A];
  }

  if (!Array.isArray(B[0])) {
    // B is vector, convert to [[a], [b], [c], ...]]
    B = <TMatrix>B.map((x) => [x]);
  }

  const p = (B[0] as TVector).length;
  const B_cols = (B[0] as TVector).map((_, i) =>
    (B as TMatrix).map((x) => x[i])
  ); // transpose B
  let product: TVector | TMatrix = (A as TMatrix).map((row) =>
    (B_cols as TMatrix).map((col) => {
      if (!Array.isArray(row)) {
        return col.reduce((a, c) => a + c * row, 0);
      }

      return row.reduce((a, c, i) => a + c * (col[i] || 0), 0);
    })
  );

  if (m === 1) {
    product = <TVector>product[0]; // Avoid [[a, b, c, ...]]
  }

  if (p === 1) {
    return <TVector>(product as TMatrix).map((x) => x[0]); // Avoid [[a], [b], [c], ...]]
  }

  return product;
}

/**
 * Convert gamma-corrected sRGB value to linear-light sRGB.
 *
 * @param rgb An object literal with ``r``, ``g`` and ``b`` attributes in
 *            range [0..1], representing gamma-corrected sRGB values.
 * @returns An object literal with ``r``, ``g`` and ``b`` attributes in
 *          range [0..1], representing linear-light sRGB values.
 *
 * The implementation is taken from
 * https://github.com/Evercoder/culori/blob/v3.1.0/src/lrgb/convertRgbToLrgb.js
 * and complemented with type information.
 * See https://www.w3.org/TR/css-color-4/#color-conversion-code for reference.
 */
export function convertGammaRgbToLinearRgb(rgb: TRgb): TLinRgb {
  function fn(val: number) {
    const abs = Math.abs(val);
    if (abs < 0.04045) {
      return val / 12.92;
    }
    return (Math.sign(val) || 1) * Math.pow((abs + 0.055) / 1.055, 2.4);
  }

  return {
    r: fn(rgb.r),
    g: fn(rgb.g),
    b: fn(rgb.b),
  };
}

/**
 * Convert linear-light sRGB value to gamma-corrected sRGB.
 *
 * @param rgb An object literal with ``r``, ``g`` and ``b`` attributes in
 *            range [0..1], representing linear-light sRGB values.
 * @returns An object literal with ``r``, ``g`` and ``b`` attributes in
 *          range [0..1], representing gamma-corrected sRGB values.
 *
 * The implementation is taken from
 * https://github.com/Evercoder/culori/blob/v3.1.0/src/lrgb/convertLrgbToRgb.js
 * and complemented with type information.
 * See https://www.w3.org/TR/css-color-4/#color-conversion-code for reference.
 */
export function convertLinearRgbToGammaRgb(rgb: TLinRgb): TRgb {
  function fn(val: number) {
    const abs = Math.abs(val);
    if (abs > 0.0031308) {
      return (Math.sign(val) || 1) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
    }
    return val * 12.92;
  }

  return {
    r: fn(rgb.r),
    g: fn(rgb.g),
    b: fn(rgb.b),
  };
}

/**
 * Convert linear-light sRGB to CIE XYZ (D65).
 *
 * @param rgb An object literal with ``r``, ``g`` and ``b`` attributes in
 *            range [0..1], representing linear-light sRGB values.
 * @returns An object literal with ``x``, ``y`` and ``z`` attributes,
 *          representing coordinates in CIE XYZ.
 *
 * The implementation is adapted from
 * https://www.w3.org/TR/css-color-4/#color-conversion-code and complemented
 * with type information.
 */
export function convertLinearRgbToXyz(rgb: TLinRgb): TXyz {
  const M = [
    [506752 / 1228815, 87881 / 245763, 12673 / 70218],
    [87098 / 409605, 175762 / 245763, 12673 / 175545],
    [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
  ];

  // This is a ``TVector`` because the second multiplier is a vector
  const tmp = <TColorCoordinates>multiplyMatrices(M, [rgb.r, rgb.g, rgb.b]);

  return {
    x: tmp[0],
    y: tmp[1],
    z: tmp[2],
  };
}

/**
 * Convert CIE XYZ (D65) to linear-light sRGB.
 *
 * @param xyz An object literal with ``x``, ``y`` and ``z`` attributes,
 *            representing coordinates in CIE XYZ.
 * @returns An object literal with ``r``, ``g`` and ``b`` attributes in
 *          range [0..1], representing linear-light sRGB values.
 *
 * The implementation is adapted from
 * https://www.w3.org/TR/css-color-4/#color-conversion-code and complemented
 * with type information.
 */
export function convertXyzToLinearRgb(xyz: TXyz): TLinRgb {
  const M = [
    [12831 / 3959, -329 / 214, -1974 / 3959],
    [-851781 / 878810, 1648619 / 878810, 36519 / 878810],
    [705 / 12673, -2585 / 12673, 705 / 667],
  ];

  // This is a ``TVector`` because the second multiplier is a vector
  const tmp = <TColorCoordinates>multiplyMatrices(M, [xyz.x, xyz.y, xyz.z]);

  return {
    r: tmp[0],
    g: tmp[1],
    b: tmp[2],
  };
}

/**
 * Convert CIE XYZ (D65) to gamma-corrected sRGB.
 *
 * @param xyz An object literal with ``x``, ``y`` and ``z`` attributes,
 *            representing coordinates in CIE XYZ.
 * @returns An object literal with ``r``, ``g`` and ``b`` attributes in
 *          range [0..1], representing gamma-corrected sRGB values.
 *
 * This is a shortcut function. See ``convertXyzToLinearRgb()`` and
 * ``convertLinearRgbToGammaRgb()`` for implementation details.
 */
export function convertXyzToGammaRgb(xyz: TXyz): TRgb {
  return convertLinearRgbToGammaRgb(convertXyzToLinearRgb(xyz));
}

/**
 * Convert gamma-corrected sRGB to CIE XYZ (D65).
 *
 * @param rgb An object literal with ``r``, ``g`` and ``b`` attributes in
 *            range [0..1], representing gamma-corrected sRGB values.
 * @returns An object literal with ``x``, ``y`` and ``z`` attributes,
 *          representing coordinates in CIE XYZ.
 *
 * This is a shortcut function. See ``convertGammaRgbToLinearRgb()`` and
 * ``convertLinearRgbToXyz()`` for implementation details.
 */
export function convertGammaRgbToXyz(rgb: TRgb): TXyz {
  return convertLinearRgbToXyz(convertGammaRgbToLinearRgb(rgb));
}

// FIXME: NEEDS IMPLEMENTATION!
export function convertOklchToXyz(oklch: TOklch): TXyz {
  console.debug(oklch);
  return {
    x: 0.25,
    y: 0.25,
    z: 0.25,
  };
}

/**
 * Convert CIE XYZ (D65) to Oklab.
 *
 * @param xyz An object literal with ``x``, ``y`` and ``z`` attributes,
 *            representing coordinates in CIE XYZ.
 * @returns An object literal with ``l``, ``a`` and ``b`` attributes in
 *          range [0..1], representing Oklab color coordinates.
 *
 * The implementation is adapted from
 * https://www.w3.org/TR/css-color-4/#color-conversion-code and complemented
 * with type information.
 *
 * For more reference see https://bottosson.github.io/posts/oklab/.
 */
export function convertXyzToOklab(xyz: TXyz): TOklab {
  const M1 = [
    [0.8190224432164319, 0.3619062562801221, -0.12887378261216414],
    [0.0329836671980271, 0.9292868468965546, 0.03614466816999844],
    [0.048177199566046255, 0.26423952494422764, 0.6335478258136937],
  ];

  const M2 = [
    [0.2104542553, 0.793617785, -0.0040720468],
    [1.9779984951, -2.428592205, 0.4505937099],
    [0.0259040371, 0.7827717662, -0.808675766],
  ];
  const LMS = <TColorCoordinates>multiplyMatrices(M1, [xyz.x, xyz.y, xyz.z]);
  const oklab = <TColorCoordinates>multiplyMatrices(
    M2,
    LMS.map((c) => Math.cbrt(c))
  );

  return {
    l: oklab[0],
    a: oklab[1],
    b: oklab[2],
  };
}

/**
 * Convert Oklab to Oklch.
 *
 * @param oklab An object literal with ``l``, ``a`` and ``b`` attributes,
 *              representing coordinates in CIE XYZ.
 * @returns An object literal with ``l``, ``c`` and ``h`` attributes in
 *          range [0..1], representing Oklch color coordinates.
 *
 * The implementation is adapted from
 * https://www.w3.org/TR/css-color-4/#color-conversion-code and complemented
 * with type information.
 */
export function convertOklabToOklch(oklab: TOklab): TOklch {
  const hue = (Math.atan2(oklab.b, oklab.a) * 180) / Math.PI;
  return {
    l: oklab.l,
    c: Math.sqrt(oklab.a ** 2 + oklab.b ** 2),
    h: hue >= 0 ? hue : hue + 360,
  };
}

/**
 * Convert CIE XYZ (D65) to Oklab.
 *
 * @param xyz An object literal with ``x``, ``y`` and ``z`` attributes,
 *            representing coordinates in CIE XYZ.
 * @returns An object literal with ``l``, ``c`` and ``h`` attributes in
 *          range [0..1], representing Oklch color coordinates.
 *
 * This is a shortcut function. See ``convertXyzToOklab()`` and
 * ``convertOklabToOklch()`` for implementation details.
 */
export function convertXyzToOklch(xyz: TXyz): TOklch {
  return convertOklabToOklch(convertXyzToOklab(xyz));
}
