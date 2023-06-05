// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

type TVector = number[]; // an Array of numbers
type TMatrix = TVector[]; // basically this is ``number[][]``, an Array of Arrays of numbers
type TColorCoordinates = [number, number, number]; // Colors are represented by three coordinates. This is an internal thing to ensure array access
export type THsl = { h: number; s: number; l: number };
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

/**
 * Convert HSL notation sRGB to CIE XYZ (D65).
 *
 * @param hsl An object literal with ``h`` attribute in range [0..360] and ``s``
 *            and ``l`` in range [0..1].
 * @returns An object literal with ``x``, ``y`` and ``z`` attributes,
 *          representing coordinates in CIE XYZ.
 *
 * This is a shortcut function. See ``translateHslNotationToGammaRgb()`` and
 * ``convertGammaRgbToXyz()`` for implementation details.
 */
export function convertHslToXyz(hsl: THsl): TXyz {
  return convertGammaRgbToXyz(translateHslNotationToGammaRgb(hsl));
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
 * Convert Oklab to Oklch.
 *
 * @param oklab An object literal with ``l``, ``a`` and ``b`` attributes in
 *              range [0..1].
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
 * Convert Oklab to CIE XYZ (D65).
 *
 * @param oklab An object literal with ``l``, ``a`` and ``b`` attributes in
 *              range [0..1].
 * @returns An object literal with ``x``, ``y`` and ``z`` attributes,
 *          representing coordinates in CIE XYZ.
 *
 * The implementation is adapted from
 * https://www.w3.org/TR/css-color-4/#color-conversion-code and complemented
 */
export function convertOklabToXyz(oklab: TOklab): TXyz {
  const LmsToXyz = [
    [1.2268798733741557, -0.5578149965554813, 0.28139105017721583],
    [-0.04057576262431372, 1.1122868293970594, -0.07171106666151701],
    [-0.07637294974672142, -0.4214933239627914, 1.5869240244272418],
  ];

  // The values of this matrix are taken from the CSS Color 4 spec, but
  // eslint complains about losing precision during runtime.
  //
  /* eslint-disable @typescript-eslint/no-loss-of-precision */
  const OklabToLms = [
    [0.99999999845051981432, 0.39633779217376785678, 0.21580375806075880339],
    [1.0000000088817607767, -0.1055613423236563494, -0.063854174771705903402],
    [1.0000000546724109177, -0.089484182094965759684, -1.2914855378640917399],
  ];
  /* eslint-enable @typescript-eslint/no-loss-of-precision */

  const Lms = <TColorCoordinates>(
    multiplyMatrices(OklabToLms, [oklab.l, oklab.a, oklab.b])
  );
  const xyz = <TColorCoordinates>multiplyMatrices(
    LmsToXyz,
    Lms.map((c) => c ** 3)
  );

  return {
    x: xyz[0],
    y: xyz[1],
    z: xyz[2],
  };
}

/**
 * Convert Oklch to Oklab.
 *
 * @param oklch An object literal with attributes ``l``, ``c`` in range [0..1]
 *              and attribute ``h`` in range [0..360].
 * @returns An object literal with ``l``, ``a`` and ``b`` attributes in
 *          range [0..1], representing Oklab color coordinates.
 *
 * The implementation is adapted from
 * https://www.w3.org/TR/css-color-4/#color-conversion-code and complemented
 * with type information.
 */
export function convertOklchToOklab(oklch: TOklch): TOklab {
  return {
    l: oklch.l,
    a: oklch.c * Math.cos((oklch.h * Math.PI) / 180),
    b: oklch.c * Math.sin((oklch.h * Math.PI) / 180),
  };
}

/**
 *
 * @param oklch An object literal with attributes ``l``, ``c`` in range [0..1]
 *              and attribute ``h`` in range [0..360].
 * @returns An object literal with ``x``, ``y`` and ``z`` attributes,
 *          representing coordinates in CIE XYZ.
 *
 * This is a shortcut function. See ``convertOklchToOklab()`` and
 * ``convertOklabToXyz()`` for implementation details.
 */
export function convertOklchToXyz(oklch: TOklch): TXyz {
  return convertOklabToXyz(convertOklchToOklab(oklch));
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
 * Convert CIE XYZ (D65) to HSL notation sRGB.
 *
 * @param xyz An object literal with ``x``, ``y`` and ``z`` attributes,
 *            representing coordinates in CIE XYZ.
 * @returns An object literal with ``h`` attribute in range [0..360] and ``s``
 *          and ``l`` in range [0..1].
 *
 * This is a shortcut function. See ``convertXyzToGammaRgb()`` and
 * ``translateGammaRgbToHslNotation()`` for implementation details.
 */
export function convertXyzToHsl(xyz: TXyz): THsl {
  return translateGammaRgbToHslNotation(convertXyzToGammaRgb(xyz));
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

  function clipToGamut(val: number): number {
    // TODO: [#25] Should this be done here or - as late as possible - in
    //       ``convertLinearRgbToGammaRgb()``?
    if (val < 0) {
      return 0;
    }

    if (val > 1) {
      return 1;
    }

    return val;
  }

  // This is a ``TVector`` because the second multiplier is a vector
  const tmp = <TColorCoordinates>multiplyMatrices(M, [xyz.x, xyz.y, xyz.z]);

  return {
    r: clipToGamut(tmp[0]),
    g: clipToGamut(tmp[1]),
    b: clipToGamut(tmp[2]),
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
  const XyzToLms = [
    [0.8190224432164319, 0.3619062562801221, -0.12887378261216414],
    [0.0329836671980271, 0.9292868468965546, 0.03614466816999844],
    [0.048177199566046255, 0.26423952494422764, 0.6335478258136937],
  ];

  const LmsToOklab = [
    [0.2104542553, 0.793617785, -0.0040720468],
    [1.9779984951, -2.428592205, 0.4505937099],
    [0.0259040371, 0.7827717662, -0.808675766],
  ];

  const Lms = <TColorCoordinates>(
    multiplyMatrices(XyzToLms, [xyz.x, xyz.y, xyz.z])
  );
  const oklab = <TColorCoordinates>multiplyMatrices(
    LmsToOklab,
    Lms.map((c) => Math.cbrt(c))
  );

  return {
    l: oklab[0],
    a: oklab[1],
    b: oklab[2],
  };
}

/**
 * Convert CIE XYZ (D65) to Oklch.
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

/**
 * Translate gamma-corrected sRGB value to HSL notation.
 *
 * @param rgb An object literal with ``r``, ``g`` and ``b`` attributes in
 *            range [0..1], representing gamma-corrected sRGB values.
 * @returns An object literal with ``h`` attribute in range [0..360] and ``s``
 *          and ``l`` in range [0..1].
 *
 * The implementation is taken from
 * https://www.w3.org/TR/css-color-4/#rgb-to-hsl and complemented with type
 * information.
 *
 * HSL is no dedicated color space but more of a different notation for sRGB.
 */
export function translateGammaRgbToHslNotation(rgb: TRgb): THsl {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const d = max - min;
  const light = (min + max) / 2;
  let hue = Number.NaN;
  let sat = 0;

  if (d !== 0) {
    sat =
      light === 0 || light === 1
        ? 0
        : (max - light) / Math.min(light, 1 - light);

    switch (max) {
      case rgb.r:
        hue = (rgb.g - rgb.b) / d + (rgb.g < rgb.b ? 6 : 0);
        break;
      case rgb.g:
        hue = (rgb.b - rgb.r) / d + 2;
        break;
      case rgb.b:
        hue = (rgb.r - rgb.g) / d + 4;
    }

    hue = hue * 60;
  }

  return {
    h: hue,
    s: sat,
    l: light,
  };
}

/**
 * Translate HSL notation sRGB to gamma-corrected sRGB.
 *
 * @param hsl An object literal with ``h`` attribute in range [0..360] and ``s``
 *            and ``l`` in range [0..1].
 * @returns An object literal with ``r``, ``g`` and ``b`` attributes in
 *          range [0..1], representing gamma-corrected sRGB values.
 *
 * The implementation is taken from
 * https://www.w3.org/TR/css-color-4/#hsl-to-rgb and complemented with type
 * information.
 *
 * HSL is no dedicated color space but more of a different notation for sRGB.
 */
export function translateHslNotationToGammaRgb(hsl: THsl): TRgb {
  hsl.h = hsl.h % 360;

  if (hsl.h < 0) {
    hsl.h += 360;
  }

  function f(n: number) {
    const k = (n + hsl.h / 30) % 12;
    const a = hsl.s * Math.min(hsl.l, 1 - hsl.l);
    return hsl.l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  }

  return {
    r: f(0),
    g: f(8),
    b: f(4),
  };
}
