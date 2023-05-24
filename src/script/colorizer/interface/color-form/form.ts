// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getDomElement } from "../../../utility";
import { getColorFormInput, IColorFormInputMethod } from "./input-methods";

// This type describes the ``ColorForm.receiveColor()`` method.
export type TColorFormReceiverCallback = (foo: string) => void;

export class ColorForm {
  private static formId = "color-form";
  private form: HTMLFormElement;
  private inputMethods: IColorFormInputMethod[] = [];

  constructor() {
    this.form = <HTMLFormElement>(
      getDomElement(null, `#${(this.constructor as typeof ColorForm).formId}`)
    );

    // Setup the available input methods and keep track of them
    this.inputMethods.push(
      getColorFormInput("rgb", this.receiveColor.bind(this))
    );

    // TODO: Remove debug statements
    console.debug(this.form);
    console.debug(this.inputMethods);
  }

  // TODO: Heavily work in progress here!
  private receiveColor(foo: string): void {
    console.info(foo);
    console.info(this.form);
  }
}
