// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { TColorFormReceiverCallback } from "./form";
import { ColorizerColor } from "../../lib/color";
import { getDomElement } from "../../../utility";

type TColorFormInputMethod = "rgb" | "hsl" | "hwb" | "oklch";
// The ``args`` array is required, as the functions that are described by this
// signature are called using ``apply()``.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TColorFormInputCallback = (evt?: Event, ...args: any[]) => void;

export interface IColorFormInputMethod {
  getColor(): ColorizerColor;
  setColor(color: ColorizerColor): void;
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
  protected fieldset: HTMLFieldSetElement;
  protected inputReceiver: TColorFormReceiverCallback;

  // TODO: EXPERIMENTAL!
  protected cAText: HTMLInputElement;
  protected cASlider: HTMLInputElement;
  protected cAProperty: string;
  protected cBText: HTMLInputElement;
  protected cBSlider: HTMLInputElement;
  protected cBProperty: string;
  protected cCText: HTMLInputElement;
  protected cCSlider: HTMLInputElement;
  protected cCProperty: string;

  constructor(
    fieldsetId: string,
    cASelector: string,
    cAProperty: string,
    cBSelector: string,
    cBProperty: string,
    cCSelector: string,
    cCProperty: string,
    receiver: TColorFormReceiverCallback
  ) {
    // Store elemental values in the instance
    this.cAProperty = cAProperty;
    this.cBProperty = cBProperty;
    this.cCProperty = cCProperty;
    this.inputReceiver = receiver;

    // Get DOM elements
    this.fieldset = <HTMLFieldSetElement>getDomElement(null, fieldsetId);

    // TODO: EXPERIMENTAL!
    this.cAText = <HTMLInputElement>(
      getDomElement(this.fieldset, `${cASelector} > input[type=text]`)
    );
    this.cASlider = <HTMLInputElement>(
      getDomElement(this.fieldset, `${cASelector} > input[type=range]`)
    );
    this.cBText = <HTMLInputElement>(
      getDomElement(this.fieldset, `${cBSelector} > input[type=text]`)
    );
    this.cBSlider = <HTMLInputElement>(
      getDomElement(this.fieldset, `${cBSelector} > input[type=range]`)
    );
    this.cCText = <HTMLInputElement>(
      getDomElement(this.fieldset, `${cCSelector} > input[type=text]`)
    );
    this.cCSlider = <HTMLInputElement>(
      getDomElement(this.fieldset, `${cCSelector} > input[type=range]`)
    );

    // Establish connections between related input elements
    this.fieldset.addEventListener(
      "input",
      this.synchronizeInputElements.bind(this)
    );

    // Attach event listeners for publishing the current color.
    //
    // The actual method (``publishColor()``) is executed with a (configurable)
    // delay using ``debounceInput()``.
    //
    // eslint complains about the usage of an *unbound method*. This rule is
    // ignored for this block, as ``debounceInput()`` will take care of the
    // correct binding of ``publishColor()``.
    //
    // See https://typescript-eslint.io/rules/unbound-method/
    //
    /* eslint-disable @typescript-eslint/unbound-method */
    this.fieldset.addEventListener(
      "input",
      (this.constructor as typeof ColorFormInputMethod).debounceInput(
        this,
        this.publishColor,
        500 // TODO: Should this be configurable?
      )
    );
    /* eslint-enable @typescript-eslint/unbound-method */

    // Setup the tooltip
    (this.constructor as typeof ColorFormInputMethod).setupTooltip(
      this.fieldset
    );
  }

  public abstract getColor(): ColorizerColor;
  public abstract setColor(color: ColorizerColor): void;

  /**
   * Publish the current color to the parent ``<form ...>``.
   *
   * Internally, this relies on ``getColor()`` to retrieve the current color.
   *
   * The parent ``<form ...>`` is notified using the provided callback
   * function ``this.inputReceiver()``.
   */
  protected publishColor(evt?: Event): void {
    // The ``Event``/``InputEvent`` is handled here!
    if (evt !== undefined) {
      evt.stopPropagation();
    }

    this.inputReceiver(this.getColor());
  }

  /**
   * Provide synchronization between ``input`` elements.
   *
   * The implementation assumes, that the input method uses three distinct
   * components / color coordinates, each of them represented by a (numerical)
   * text input and a slider to adjust the value.
   *
   * The value is assumed to be a *number*.
   *
   * Internally, no sanitization or input validation is performed. The value
   * is just applied to the corresponding element and set as a custom CSS
   * property on the instance's ``fieldset`` element (using
   * ``updateCoordateInStyleProperty()``).
   */
  protected synchronizeInputElements(evt: Event): void {
    // The ``Event``/``InputEvent`` is handled here!
    evt.stopPropagation();

    // Assuming that all inputs are based on numbers!
    let val: string;

    switch (evt.target) {
      case this.cAText:
        val = Number(this.cAText.value).toString();
        this.cASlider.value = val;
        this.updateCoordinateInStyleProperty(this.cAProperty, val);
        break;
      case this.cASlider:
        val = Number(this.cASlider.value).toString();
        this.cAText.value = val;
        this.updateCoordinateInStyleProperty(this.cAProperty, val);
        break;
      case this.cBText:
        val = Number(this.cBText.value).toString();
        this.cBSlider.value = val;
        this.updateCoordinateInStyleProperty(this.cBProperty, val);
        break;
      case this.cBSlider:
        val = Number(this.cBSlider.value).toString();
        this.cBText.value = val;
        this.updateCoordinateInStyleProperty(this.cBProperty, val);
        break;
      case this.cCText:
        val = Number(this.cCText.value).toString();
        this.cCSlider.value = val;
        this.updateCoordinateInStyleProperty(this.cCProperty, val);
        break;
      case this.cCSlider:
        val = Number(this.cCSlider.value).toString();
        this.cCText.value = val;
        this.updateCoordinateInStyleProperty(this.cCProperty, val);
        break;
      default:
        console.warn(
          // The ``evt.target`` might be ``null``, which is marked by eslint.
          // However, for debugging it is desired to know the actual value of
          // ``evt.target``, even if it is ``null``.
          //
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `"InputEvent" originated from an unexpected element: ${evt.target}`
        );
    }
  }

  /**
   * Sets a custom CSS property on the ``fieldset`` element.
   *
   * @param propertyName The name of the custom CSS property.
   * @param value The actual value.
   */
  protected updateCoordinateInStyleProperty(
    propertyName: string,
    value: string
  ): void {
    this.fieldset.style.setProperty(propertyName, value);
  }

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
  private inputTextRed: HTMLInputElement;
  private inputSliderRed: HTMLInputElement;
  private stylePropertyRed = "--this-red";
  private inputTextGreen: HTMLInputElement;
  private inputSliderGreen: HTMLInputElement;
  private stylePropertyGreen = "--this-green";
  private inputTextBlue: HTMLInputElement;
  private inputSliderBlue: HTMLInputElement;
  private stylePropertyBlue = "--this-blue";

  constructor(receiver: TColorFormReceiverCallback) {
    super(
      "#color-form-rgb",
      ".component-red",
      "--this-red",
      ".component-green",
      "--this-green",
      ".component-blue",
      "--this-blue",
      receiver
    );

    // Get DOM elements
    this.inputTextRed = this.cAText;
    this.inputSliderRed = this.cASlider;
    this.inputTextGreen = this.cBText;
    this.inputSliderGreen = this.cBSlider;
    this.inputTextBlue = this.cCText;
    this.inputSliderBlue = this.cCSlider;
  }

  /**
   * Return the current color.
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
   */
  public getColor(): ColorizerColor {
    return ColorizerColor.fromRgb255(
      Number(this.inputTextRed.value),
      Number(this.inputTextGreen.value),
      Number(this.inputTextBlue.value)
    );
  }

  /**
   * Set the color of this input method.
   *
   * @param color An instance of ``ColorizerColor``.
   */
  public setColor(color: ColorizerColor): void {
    const color255 = color.toRgb255();

    let tmp = color255.r.toString();
    this.inputTextRed.value = tmp;
    this.inputSliderRed.value = tmp;
    this.updateCoordinateInStyleProperty(this.stylePropertyRed, tmp);

    tmp = color255.g.toString();
    this.inputTextGreen.value = tmp;
    this.inputSliderGreen.value = tmp;
    this.updateCoordinateInStyleProperty(this.stylePropertyGreen, tmp);

    tmp = color255.b.toString();
    this.inputTextBlue.value = tmp;
    this.inputSliderBlue.value = tmp;
    this.updateCoordinateInStyleProperty(this.stylePropertyBlue, tmp);
  }
}
