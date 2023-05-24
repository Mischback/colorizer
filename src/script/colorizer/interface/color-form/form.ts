// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getDomElement } from "../../../utility";
import { getColorFormInput, IColorFormInputMethod } from "./input-methods";

export class ColorForm {
  private static formId = "color-form";
  private form: HTMLFormElement;
  private inputMethods: IColorFormInputMethod[] = [];

  constructor() {
    this.form = <HTMLFormElement>(
      getDomElement(null, `#${(this.constructor as typeof ColorForm).formId}`)
    );

    // Setup the available input methods and keep track of them
    this.inputMethods.push(getColorFormInput("rgb"));

    // TODO: Remove debug statements
    console.debug(this.form);
    console.debug(this.inputMethods);
  }
}
