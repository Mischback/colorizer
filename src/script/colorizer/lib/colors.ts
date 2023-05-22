// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

type TVector = number[];
type TMatrix = TVector[]; // basically this is ``number[][]``

/**
 * Multiply two matrices.
 *
 * @param A First matrix, assumed to be *m x n*.
 * @param B Second matrix, assumed to be *n x p*.
 * @returns The product, should be *m x p*.
 * @author Lea Verou 2020 MIT License
 *
 * This implementation is fetched from
 * https://www.w3.org/TR/css-color-4/multiply-matrices.js which is provided by
 * Lea Verou under MIT license.
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
 * @param rgb Array with three values (for the red, green and blue component).
 * @returns Array with three values (for the red, green and blue component).
 *
 * The implementation is taken from
 * https://www.w3.org/TR/css-color-4/#color-conversion-code and complemented
 * with type information.
 */
function sRgbToLinear(rgb: [number, number, number]): [number, number, number] {
  return <[number, number, number]>rgb.map((val) => {
    const sign = val < 0 ? -1 : 1;
    const abs = Math.abs(val);

    if (abs < 0.04045) {
      return val / 12.92;
    }

    return sign * Math.pow((abs + 0.055) / 1.055, 2.4);
  });
}

/**
 * Convert linear-light sRGB to CIE XYZ (D65).
 *
 * @param rgb Array with three values (for the red, green and blue component).
 * @returns Array with three values (representing the X, Y and Z coordinates).
 *
 * The implementation is taken from
 * https://www.w3.org/TR/css-color-4/#color-conversion-code and complemented
 * with type information.
 */
function linearSRgbToXyz(
  rgb: [number, number, number]
): [number, number, number] {
  const M = [
    [506752 / 1228815, 87881 / 245763, 12673 / 70218],
    [87098 / 409605, 175762 / 245763, 12673 / 175545],
    [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
  ];

  return <[number, number, number]>multiplyMatrices(M, rgb);
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

  public toJSON(): object {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
    };
  }

  public static fromRgb(red: number, green: number, blue: number) {
    const xyz = linearSRgbToXyz(sRgbToLinear([red, green, blue]));
    console.debug(xyz);
    return new ColorizerColor(xyz[0], xyz[1], xyz[2]);
  }
}
