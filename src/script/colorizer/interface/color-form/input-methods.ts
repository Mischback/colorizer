// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { TColorFormReceiverCallback } from "./form";
import { ColorizerColor } from "../../lib/color";
import { getDomElement } from "../../../utility";

/**
 * Dedicated typing for the available input methods.
 *
 * TODO: Actually implement all of them! ;)
 */
export type TColorFormInputMethod = "rgb" | "hsl" | "hwb" | "oklch";

/**
 * The generic prototype of a function that acts a a callback / event handler
 * for input events.
 */
// The ``args`` array is required, as the functions that are described by this
// signature are called using ``apply()``.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TColorFormInputCallback = (evt?: Event, ...args: any[]) => void;

/**
 * The public interface of the input method classes.
 */
export interface IColorFormInputMethod {
  getColor(): ColorizerColor;
  setColor(color: ColorizerColor): void;
}

/**
 * Create an instance of an input method class.
 *
 * @param method The method / colorspace that should be instantiated.
 * @param receiver A callback function that will be executed when the color
 *                 is modified. Intended to *publish* the color of the method
 *                 to the parent form.
 *
 * This is meant to be a very basic implementation of the *Builder* pattern.
 * Main idea is to keep the actual input method classes in this module
 * exclusively and only exposing this function to create instances (and the
 * ``IColorFormInputMethod`` to define the external interface).
 *
 * TODO: [#23] Expose ``inputDebounceDelay`` argument!
 */
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

/**
 * Base class for alle input methods.
 *
 * @param fieldsetId The ``id`` attribute of the method's parent
 *                   ``<fieldset ...>`` element, used to get the DOM element
 *                   using ``querySelector()``.
 * @param cASelector The selector for the *A component*. It will be searched
 *                   as a sibling of the ``<fieldset ...>`` element and used to
 *                   identify the component's text input and range input.
 * @param cAProperty The name of a CSS custom property that will be set on the
 *                   ``<fieldset ...>`` element to trach the *A component's*
 *                   current value.
 * @param cBSelector The selector for the *B component*. It will be searched
 *                   as a sibling of the ``<fieldset ...>`` element and used to
 *                   identify the component's text input and range input.
 * @param cBProperty The name of a CSS custom property that will be set on the
 *                   ``<fieldset ...>`` element to trach the *B component's*
 *                   current value.
 * @param cCSelector The selector for the *C component*. It will be searched
 *                   as a sibling of the ``<fieldset ...>`` element and used to
 *                   identify the component's text input and range input.
 * @param cCProperty The name of a CSS custom property that will be set on the
 *                   ``<fieldset ...>`` element to trach the *C component's*
 *                   current value.
 * @param receiver A callback function that is called whenever the input
 *                 method's current color changes.
 * @param inputDebounceDelay The delay to be applied to the method's input
 *                           event handlers, given in **ms** and passed to
 *                           ``setTimeout()``. Default: ``500``.
 *
 * This class provides the implementations for the generic, method-unrelated,
 * repetitive tasks. It does handle the heavy lifting, like synchronizing the
 * ``<input ...>`` elements and publishing the color to the parent
 * ``<form ...>`` element.
 *
 * The implementations are as generic as possible, so there are some
 * assumptions:
 * - the input method relies on **three** *coordinates* / *components* to
 *   represent the color;
 * - each *coordinate* / *component* is represented by a number of a given
 *   range;
 * - all required DOM elements are structured as siblings of a ``fieldset``
 *   element and follow a pre-defined structure;
 */
abstract class ColorFormInputMethod implements IColorFormInputMethod {
  private fieldset: HTMLFieldSetElement;
  private inputReceiver: TColorFormReceiverCallback;
  private inputDebounceDelay: number;
  protected cAText: HTMLInputElement;
  protected cASlider: HTMLInputElement;
  protected cAProperty: string;
  protected cBText: HTMLInputElement;
  protected cBSlider: HTMLInputElement;
  protected cBProperty: string;
  protected cCText: HTMLInputElement;
  protected cCSlider: HTMLInputElement;
  protected cCProperty: string;

  public abstract getColor(): ColorizerColor;
  public abstract setColor(color: ColorizerColor): void;

  constructor(
    fieldsetId: string,
    cASelector: string,
    cAProperty: string,
    cBSelector: string,
    cBProperty: string,
    cCSelector: string,
    cCProperty: string,
    receiver: TColorFormReceiverCallback,
    inputDebounceDelay = 500
  ) {
    // Store elemental values in the instance
    this.cAProperty = cAProperty;
    this.cBProperty = cBProperty;
    this.cCProperty = cCProperty;
    this.inputReceiver = receiver;
    this.inputDebounceDelay = inputDebounceDelay;

    // Get DOM elements
    this.fieldset = <HTMLFieldSetElement>getDomElement(null, fieldsetId);
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
        this.inputDebounceDelay
      )
    );
    /* eslint-enable @typescript-eslint/unbound-method */

    // Setup the tooltip
    (this.constructor as typeof ColorFormInputMethod).setupTooltip(
      this.fieldset
    );
  }

  /**
   * Publish the current color to the parent ``<form ...>``.
   *
   * Internally, this relies on ``getColor()`` to retrieve the current color.
   *
   * The parent ``<form ...>`` is notified using the provided callback
   * function ``this.inputReceiver()``.
   */
  private publishColor(evt?: Event): void {
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
  private synchronizeInputElements(evt: Event): void {
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
  private static debounceInput(
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
  private static setupTooltip(container: HTMLFieldSetElement): void {
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
      }, 100);
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

/**
 * Represent sRGB with values in range [0..255].
 *
 * @param receiver A callback function that is called whenever the input
 *                 method's current color changes.
 * @param inputDebounceDelay The delay to be applied to the method's input
 *                           event handlers, given in **ms** and passed to
 *                           ``setTimeout()``. **Optional**, will get a default
 *                           value of ``500`` in ``ColorFormInputMethod``.
 */
class ColorFormInputRgb
  extends ColorFormInputMethod
  implements IColorFormInputMethod
{
  constructor(
    receiver: TColorFormReceiverCallback,
    inputDebounceDelay?: number
  ) {
    // cA = red component
    // cB = green component
    // cC = blue component
    super(
      "#color-form-rgb",
      ".component-red",
      "--this-red",
      ".component-green",
      "--this-green",
      ".component-blue",
      "--this-blue",
      receiver,
      inputDebounceDelay
    );
  }

  /**
   * Return the current color.
   *
   * This method creates an instance of ``ColorizerColor``, using the values
   * of the ``<input type="text" ...>`` elements (which are synchronized with
   * the corresponding sliders!).
   *
   * The values of the ``<input type="text" ...>`` elements are converted to
   * actual numbers by calling ``Number()`` on them. Converting them to the
   * required integers (numbers without decimal places) is done in
   * ``ColorizerColor.fromRgb255()``.
   */
  public getColor(): ColorizerColor {
    return ColorizerColor.fromRgb255(
      Number(this.cAText.value),
      Number(this.cBText.value),
      Number(this.cCText.value)
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
    this.cAText.value = tmp;
    this.cASlider.value = tmp;
    this.updateCoordinateInStyleProperty(this.cAProperty, tmp);

    tmp = color255.g.toString();
    this.cBText.value = tmp;
    this.cBSlider.value = tmp;
    this.updateCoordinateInStyleProperty(this.cBProperty, tmp);

    tmp = color255.b.toString();
    this.cCText.value = tmp;
    this.cCSlider.value = tmp;
    this.updateCoordinateInStyleProperty(this.cCProperty, tmp);
  }
}
