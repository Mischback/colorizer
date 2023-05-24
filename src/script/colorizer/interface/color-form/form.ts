// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getColorFormInput, IColorFormInputMethod } from "./input-methods";
import { ColorizerColor } from "../../lib/color";
import { getDomElement } from "../../../utility";

// This type describes the ``ColorForm.receiveColor()`` method.
export type TColorFormReceiverCallback = (color: ColorizerColor) => void;

export class ColorForm {
  private static formId = "color-form";
  private form: HTMLFormElement;
  private inputMethods: IColorFormInputMethod[] = [];
  // Initialization of color **is done** in the ``constructor()`` by calling
  // ``receiveColor()``.
  //
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: strictPropertyInitialization
  private color: ColorizerColor;

  constructor() {
    this.form = <HTMLFormElement>(
      getDomElement(null, `#${(this.constructor as typeof ColorForm).formId}`)
    );

    // Setup the available input methods and keep track of them
    this.inputMethods.push(
      getColorFormInput("rgb", this.receiveColor.bind(this))
    );

    // Set an initial color for the form and all input methods
    this.receiveColor(ColorizerColor.fromRgb(0, 0, 0));

    // TODO: Remove debug statements
    console.debug(this.form);
    console.debug(this.inputMethods);
  }

  public getColor(): ColorizerColor {
    return this.color;
  }

  // TODO: Heavily work in progress here!
  private receiveColor(color: ColorizerColor): void {
    this.color = color;

    // Update the color of all available input methods
    this.inputMethods.forEach((method) => {
      method.setColor(color);
    });
  }
}
