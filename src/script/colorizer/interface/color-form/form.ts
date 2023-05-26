// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import {
  getColorFormInput,
  IColorFormInputMethod,
  TColorFormInputMethod,
} from "./input-methods";
import { ColorizerColor } from "../../lib/color";
import { getDomElement } from "../../../utility";

// This type describes the ``ColorForm.receiveColor()`` method.
export type TColorFormReceiverCallback = (color: ColorizerColor) => void;

export class ColorForm {
  private form: HTMLFormElement;
  private inputMethods: IColorFormInputMethod[] = [];
  // Initialization of color **is done** in the ``constructor()`` by calling
  // ``receiveColor()``.
  //
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: strictPropertyInitialization
  private color: ColorizerColor;

  constructor(inputMethods: TColorFormInputMethod[]) {
    this.form = <HTMLFormElement>getDomElement(null, "#color-form");

    // Setup the available input methods and keep track of them
    inputMethods.forEach((m) => {
      this.inputMethods.push(
        getColorFormInput(m, this.receiveColor.bind(this))
      );
    });

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
