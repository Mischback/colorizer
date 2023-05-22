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

  /**
   * Establish the logical connections between slider, text input and the
   * containing fieldset.
   *
   * Adds event listeners for ``input`` events to the ``<input ...>`` elements
   * to update the corresponding *other* ``<input ...>`` element.
   * The ``container`` element's ``style`` attribute is updated with a CSS
   * custom property, providing the value of the ``<input ...>`` elements for
   * styling purposes.
   */
  protected static linkContainerSliderText(
    container: HTMLFieldSetElement,
    slider: HTMLInputElement,
    text: HTMLInputElement,
    property: string
  ): void {
    // FIXME: Remove debug statements!
    // console.info("Linking form elements...");
    // console.debug(`container: ${container}`);
    // console.debug(`slider: ${slider}`);
    // console.debug(`text: ${text}`);
    // console.debug(`property: ${property}`);

    slider.addEventListener("input", () => {
      const val = Number(slider.value);
      text.value = val.toString();
      container.style.setProperty(property, val.toString());
    });
    text.addEventListener("input", () => {
      const val = Number(slider.value);
      slider.value = val.toString();
      container.style.setProperty(property, val.toString());
    });
  }
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

    // Establish connections between related input elements
    (this.constructor as typeof ColorFormInputRgb).linkContainerSliderText(
      this.fieldset,
      this.inputSliderRed,
      this.inputTextRed,
      "--this-red"
    );
    (this.constructor as typeof ColorFormInputRgb).linkContainerSliderText(
      this.fieldset,
      this.inputSliderGreen,
      this.inputTextGreen,
      "--this-green"
    );
    (this.constructor as typeof ColorFormInputRgb).linkContainerSliderText(
      this.fieldset,
      this.inputSliderBlue,
      this.inputTextBlue,
      "--this-blue"
    );

    // FIXME: Remove debug statements!
    // console.debug(this.fieldset);
    // console.debug(this.inputTextRed);
    // console.debug(this.inputSliderRed);
    // console.debug(this.inputTextGreen);
    // console.debug(this.inputSliderGreen);
    // console.debug(this.inputTextBlue);
    // console.debug(this.inputSliderBlue);
  }

  public getColor(): void {
    console.debug("getColor()...");
  }
}
