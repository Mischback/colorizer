// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

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
    console.debug(`red: ${red}, green: ${green}, blue: ${blue}`);
  }
}
