// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerColor } from "../../lib/color";
import { getDomElement } from "../../../utility";
import type { TColorizerFormReceiverCallback } from "./form";
import type { IColorizerObserver } from "../../lib/types";

/**
 * Dedicated typing for the available input methods.
 *
 * TODO: [#20] Implement "oklch"
 * TODO: [#24] Implement "hsl"
 * TODO: [#24] Implement "hwb"
 */
export type TColorizerFormInputMethod = "rgb" | "hsl" | "hwb" | "oklch";

/**
 * The generic prototype of a function that acts a a callback / event handler
 * for input events.
 */
// The ``args`` array is required, as the functions that are described by this
// signature are called using ``apply()``.
//
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TColorizerFormInputCallback = (evt?: Event, ...args: any[]) => void;

/**
 * The public interface of the input method classes.
 */
export interface IColorizerFormInputMethod {
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
 * ``IColorizerFormInputMethod`` to define the external interface).
 *
 * TODO: [#23] Expose ``inputDebounceDelay`` argument!
 */
export function getColorizerFormInput(
  method: TColorizerFormInputMethod,
  receiver: TColorizerFormReceiverCallback
): ColorizerFormInputMethod {
  switch (method) {
    case "rgb":
      return new ColorizerFormInputRgb(receiver);
    case "oklch":
      return new ColorizerFormInputOklch(receiver);
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
abstract class ColorizerFormInputMethod
  implements IColorizerFormInputMethod, IColorizerObserver
{
  private fieldset: HTMLFieldSetElement;
  private inputReceiver: TColorizerFormReceiverCallback;
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
    receiver: TColorizerFormReceiverCallback,
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
      (this.constructor as typeof ColorizerFormInputMethod).debounceInput(
        this,
        this.publishColor,
        this.inputDebounceDelay
      )
    );
    /* eslint-enable @typescript-eslint/unbound-method */

    // Setup the tooltip
    (this.constructor as typeof ColorizerFormInputMethod).setupTooltip(
      this.fieldset
    );
  }

  /**
   * Publish the current color to the parent ``<form ...>``.
   *
   * Internally, this relies on ``getColor()`` of the concrete (child) class to
   * retrieve the current color.
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
   * Receive updates of the overall current color.
   *
   * @param color The new color.
   *
   * This is part of the implementation of the Observer pattern, required by
   * ``IColorizerObserver``.
   *
   * Internally, it calls ``setColor()`` of the concrete (child) class.
   */
  public updateColor(color: ColorizerColor): void {
    this.setColor(color);
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
    context: ColorizerFormInputMethod,
    fn: TColorizerFormInputCallback,
    debounceTime: number
  ) {
    let timer: number;

    // The ``args`` to be applied *should be* an instance of a DOM ``Event``,
    // see ``TColorizerFormInputCallback``.
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

    ttButton.addEventListener("keydown", (evt) => {
      const keyboardEvent = <KeyboardEvent>evt;
      if ((keyboardEvent.keyCode || keyboardEvent.which) === 27) {
        ttDisplay.innerHTML = "";
      }
    });

    document.addEventListener("click", (evt) => {
      if (evt.target !== ttButton) {
        ttDisplay.innerHTML = "";
      }
    });

    // Setup is completed, now remove ``ttContent`` from the (visual) DOM.
    //
    // TODO: [#22] Is this the correct way? Or should it be *removed* from the
    //       DOM by using ``visibility: hidden``?
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
 *                           value of ``500`` in ``ColorizerFormInputMethod``.
 */
class ColorizerFormInputRgb
  extends ColorizerFormInputMethod
  implements IColorizerFormInputMethod
{
  constructor(
    receiver: TColorizerFormReceiverCallback,
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

/**
 * Represent Oklch color input.
 *
 * @param receiver A callback function that is called whenever the input
 *                 method's current color changes.
 * @param inputDebounceDelay The delay to be applied to the method's input
 *                           event handlers, given in **ms** and passed to
 *                           ``setTimeout()``. **Optional**, will get a default
 *                           value of ``500`` in ``ColorizerFormInputMethod``.
 */
class ColorizerFormInputOklch
  extends ColorizerFormInputMethod
  implements IColorizerFormInputMethod
{
  constructor(
    receiver: TColorizerFormReceiverCallback,
    inputDebounceDelay?: number
  ) {
    // cA = lightness component
    // cB = chroma component
    // cC = hue component
    super(
      "#color-form-oklch",
      ".component-lightness",
      "--this-lightness",
      ".component-chroma",
      "--this-chroma",
      ".component-hue",
      "--this-hue",
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
   * ``ColorizerColor.fromOklch()``.
   */
  public getColor(): ColorizerColor {
    return ColorizerColor.fromOklch(
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
    // FIXME: Rounding has to be applied in order to keep the interface clean!
    const colorOklch = color.toOklch();

    let tmp = colorOklch.l.toString();
    this.cAText.value = tmp;
    this.cASlider.value = tmp;
    this.updateCoordinateInStyleProperty(this.cAProperty, tmp);

    tmp = colorOklch.c.toString();
    this.cBText.value = tmp;
    this.cBSlider.value = tmp;
    this.updateCoordinateInStyleProperty(this.cBProperty, tmp);

    tmp = colorOklch.h.toString();
    this.cCText.value = tmp;
    this.cCSlider.value = tmp;
    this.updateCoordinateInStyleProperty(this.cCProperty, tmp);
  }
}
