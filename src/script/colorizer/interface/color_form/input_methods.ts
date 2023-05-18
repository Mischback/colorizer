// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getDomElement } from "../../../utility";

type TColorFormInputMethod = "rgb" | "hsl" | "hwb" | "oklch";

interface IColorFormInputMethod {
  getColor(): void;
}

export function getColorFormInput(
  method: TColorFormInputMethod
): ColorFormInputMethod {
  switch (method) {
    case "rgb":
      return new ColorFormInputRgb();
    default:
      throw new Error(`Unknown input method '${method}'`);
  }
}

abstract class ColorFormInputMethod implements IColorFormInputMethod {
  public abstract getColor(): void;
}

class ColorFormInputRgb
  extends ColorFormInputMethod
  implements IColorFormInputMethod
{
  private static fieldsetId = "color-form-rgb";
  private fieldset: HTMLFieldSetElement;
  // private inputTextRed: HTMLInputElement;
  // private inputSliderRed: HTMLInputElement;
  // private inputTextGreen: HTMLInputElement;
  // private inputSliderGreen: HTMLInputElement;
  // private inputTextBlue: HTMLInputElement;
  // private inputSliderBlue: HTMLInputElement;

  constructor() {
    super();

    // Get DOM elements
    this.fieldset = <HTMLFieldSetElement>(
      getDomElement(
        null,
        `#${(this.constructor as typeof ColorFormInputRgb).fieldsetId}`
      )
    );
    console.debug(this.fieldset);
  }

  public getColor(): void {
    console.debug("getColor()...");
  }
}
