// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getDomElement } from "../../../utility";
import { ColorizerColor } from "../../lib/color";
import { TColorFormReceiverCallback } from "./form";

type TColorFormInputMethod = "rgb" | "hsl" | "hwb" | "oklch";
// The ``args`` array is required, as the functions that are described by this
// signature are called using ``apply()``.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TColorFormInputCallback = (event?: Event, ...args: any[]) => void;

export interface IColorFormInputMethod {
  getColor(): void;
}

export function getColorFormInput(
  method: TColorFormInputMethod,
  receiver: TColorFormReceiverCallback
): ColorFormInputMethod {
  switch (method) {
    case "rgb":
      return new ColorFormInputRgb(receiver);
    default:
      throw new Error(`Unknown input method '${method}'`);
  }
}

abstract class ColorFormInputMethod implements IColorFormInputMethod {
  protected inputReceiver: TColorFormReceiverCallback;

  constructor(receiver: TColorFormReceiverCallback) {
    this.inputReceiver = receiver;
  }

  public abstract getColor(): void;
  protected abstract publishColor(): void;

  /**
   * *Debounce* the ``<input ...>`` elements.
   *
   * This function wraps the actual callback methods for the ``<input ...>``
   * elements and applies a *configurable delay* (``debounceTime``) before
   * executing the callback. This is meant to prevent updates of the current
   * color of the ``<form ...>`` element **while** still editing the values
   * of the ``<input ...>`` element.
   *
   * See https://chiamakaikeanyi.dev/event-debouncing-and-throttling-in-javascript/
   */
  protected static debounceInput(
    context: ColorFormInputMethod,
    fn: TColorFormInputCallback,
    debounceTime: number
  ) {
    let timer: number;

    // The ``args`` to be applied *should be* an instance of a DOM ``Event``,
    // see ``TColorFormInputCallback``.
    // As ``apply()`` does not handle more than two arguments, all arguments
    // are covered by ``args``.
    //
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (...args: any[]) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        fn.apply(context, args);
      }, debounceTime);
    };
  }

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

  constructor(receiver: TColorFormReceiverCallback) {
    super(receiver);

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

    // Attach event listeners for publishing the RGB color
    //
    // The actual method (``publishColor()``) is executed with a (configurable)
    // delay using ``debounceInput()``.
    //
    // eslint complains about the usage of an *unbound method*. This rule is
    // ignored for this block, as ``debounceInput()`` will take care of the
    // correct binding of ``publishColor()``.
    // See https://typescript-eslint.io/rules/unbound-method/
    /* eslint-disable @typescript-eslint/unbound-method */
    this.inputTextRed.addEventListener(
      "input",
      (this.constructor as typeof ColorFormInputRgb).debounceInput(
        this,
        this.publishColor,
        500
      )
    );
    this.inputSliderRed.addEventListener(
      "input",
      (this.constructor as typeof ColorFormInputRgb).debounceInput(
        this,
        this.publishColor,
        500
      )
    );
    this.inputTextGreen.addEventListener(
      "input",
      (this.constructor as typeof ColorFormInputRgb).debounceInput(
        this,
        this.publishColor,
        500
      )
    );
    this.inputSliderGreen.addEventListener(
      "input",
      (this.constructor as typeof ColorFormInputRgb).debounceInput(
        this,
        this.publishColor,
        500
      )
    );
    this.inputTextBlue.addEventListener(
      "input",
      (this.constructor as typeof ColorFormInputRgb).debounceInput(
        this,
        this.publishColor,
        500
      )
    );
    this.inputSliderBlue.addEventListener(
      "input",
      (this.constructor as typeof ColorFormInputRgb).debounceInput(
        this,
        this.publishColor,
        500
      )
    );
    /* eslint-enable @typescript-eslint/unbound-method */

    // Setup the tooltip
    (this.constructor as typeof ColorFormInputRgb).setupTooltip(this.fieldset);
  }

  public getColor(): void {
    console.debug("getColor()");
    console.debug(ColorizerColor.fromRgb(0.5, 0.5, 0.5));
  }

  /**
   * Publish the current color to the parent ``<form ...>``.
   *
   * This method creates an instance of ``ColorizerColor``, using the values
   * of the ``<input type="text" ...>`` elements (which are synchronized with
   * the corresponding sliders!) and publishes it to the parent ``<form ...>``
   * element.
   *
   * The values of the ``<input type="text" ...>`` elements are converted to
   * actual numbers by calling ``Number()`` on them. Converting them to the
   * required integers (numbers without decimal places) is done in
   * ``ColorizerColor.fromRgb255()``.
   *
   * TODO: Should this class keep track of the parent ``form`` using a
   *       reference to the (tbd) ``ColorForm`` instance or is a callback
   *       method enough?
   */
  protected publishColor(): void {
    // FIXME: Convert ``string`` to ``integer`` (``number`` without decimal places)!
    console.debug("publishColor()");

    const tmp = ColorizerColor.fromRgb255(
      Number(this.inputTextRed.value),
      Number(this.inputTextGreen.value),
      Number(this.inputTextBlue.value)
    );

    console.debug(tmp);
    this.inputReceiver("bar");
  }
}