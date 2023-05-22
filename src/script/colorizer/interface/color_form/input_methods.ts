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
  private inputTextRed: HTMLInputElement;
  private inputSliderRed: HTMLInputElement;
  private inputTextGreen: HTMLInputElement;
  private inputSliderGreen: HTMLInputElement;
  private inputTextBlue: HTMLInputElement;
  private inputSliderBlue: HTMLInputElement;

  constructor() {
    super();

    // Get DOM elements
    this.fieldset = <HTMLFieldSetElement>(
      getDomElement(
        null,
        `#${(this.constructor as typeof ColorFormInputRgb).fieldsetId}`
      )
    );
    this.inputTextRed = <HTMLInputElement>(
      getDomElement(this.fieldset, ".component-red > input[type=text]")
    );
    this.inputSliderRed = <HTMLInputElement>(
      getDomElement(this.fieldset, ".component-red > input[type=range]")
    );
    this.inputTextGreen = <HTMLInputElement>(
      getDomElement(this.fieldset, ".component-green > input[type=text]")
    );
    this.inputSliderGreen = <HTMLInputElement>(
      getDomElement(this.fieldset, ".component-green > input[type=range]")
    );
    this.inputTextBlue = <HTMLInputElement>(
      getDomElement(this.fieldset, ".component-blue > input[type=text]")
    );
    this.inputSliderBlue = <HTMLInputElement>(
      getDomElement(this.fieldset, ".component-blue > input[type=range]")
    );

    console.debug(this.fieldset);
    console.debug(this.inputTextRed);
    console.debug(this.inputSliderRed);
    console.debug(this.inputTextGreen);
    console.debug(this.inputSliderGreen);
    console.debug(this.inputTextBlue);
    console.debug(this.inputSliderBlue);
  }

  public getColor(): void {
    console.debug("getColor()...");
  }
}
