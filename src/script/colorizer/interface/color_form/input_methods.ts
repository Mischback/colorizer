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

  /**
   * Attach tooltip to a toggle button.
   *
   * The implementation is based on
   * [this guide](https://inclusive-components.design/tooltips-toggletips/).
   * It makes some **assumptions** about the general structure of the DOM,
   * meaning this script source is **heavily tied** to the actual
   * ``index.html`` (tight coupling).
   *
   * Please note: The ``<fieldset>`` is setup to be as accessible as possible
   * on its own, this tooltip adds more context and additional information.
   *
   * Implementation detail: While the content of the tooltip is accessible by
   * an ``id`` attribute, this method uses a *class-based* selector in order to
   * limit the scope of ``getDomElement()`` / ``querySelector()`` to the
   * children of the ``container``, which is known to the calling functions.
   */
  protected static setupTooltip(container: HTMLFieldSetElement): void {
    const ttButton = getDomElement(
      container,
      "legend > .tooltip-anchor > button"
    );
    const ttContent = getDomElement(container, ".tooltip-content");
    const ttDisplay = getDomElement(
      container,
      "legend > .tooltip-anchor > .tooltip-display"
    );

    ttButton.addEventListener("click", () => {
      ttDisplay.innerHTML = "";
      window.setTimeout(() => {
        ttDisplay.innerHTML = `<div>${ttContent.innerHTML}</div>`;
      }, 100); // TODO: Should this be adjustable?!
    });

    ttButton.addEventListener("keydown", (e) => {
      const keyboardEvent = <KeyboardEvent>e;
      if ((keyboardEvent.keyCode || keyboardEvent.which) === 27) {
        ttDisplay.innerHTML = "";
      }
    });

    // TODO: This is probably highly inefficient, as this event listener is
    //       attached multiple times (for every input method). Probably we can
    //       get away with this, though...
    document.addEventListener("click", (e) => {
      if (e.target !== ttButton) {
        ttDisplay.innerHTML = "";
      }
    });

    // Setup is completed, now remove ``ttContent`` from the (visual) DOM.
    //
    // TODO: Is this the correct way? Or should it be *removed* from the DOM by
    //       using ``visibility: hidden``?
    ttContent.classList.add("hide-visually");
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

    (this.constructor as typeof ColorFormInputRgb).setupTooltip(this.fieldset);

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
