// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerColor } from "../../lib/color";
import { getDomElement } from "../../../utility";
import type { TColorizerFormReceiverCallback } from "./form";
import type {
  IColorizerColorObserver,
  TColorizerColorNotation,
} from "../../lib/types";

/**
 * Dedicated typing for the available input methods.
 */
export type TColorizerFormInputMethod = Omit<TColorizerColorNotation, "xyz">;

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
    case "hsl":
      return new ColorizerFormInputHsl(receiver);
    case "hwb":
      return new ColorizerFormInputHwb(receiver);
    case "oklch":
      return new ColorizerFormInputOklch(receiver);
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
  implements IColorizerFormInputMethod, IColorizerColorObserver
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

      // Internal input validation
      //
      // The aim is to handle invalid input *gracefully*, meaning that errors
      // are silently ignored and values are forced into the acceptable range.
      //
      // The validation is based on the HTML ``pattern`` attribute of the
      // ``<input type="text" ...>`` elements.
      //
      // Ref: https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation#validating_forms_using_javascript
      if ((evt.target as HTMLInputElement).validity.valid === false) {
        console.warn("Input invalid!");
        // console.debug(evt.target);
        // console.debug((evt.target as HTMLInputElement).validity);
        // return;  // uncomment to actually stop processing the ``InputEvent``
      }
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
   * ``IColorizerColorObserver``.
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
   * actual numbers by calling ``Number()`` on them. Forcing  them into the
   * required ranges (e.g. into range [0..1]) is done in
   * ``ColorizerColor.fromOklch()``.
   */
  public getColor(): ColorizerColor {
    return ColorizerColor.fromOklch(
      Number(this.cAText.value) / 100,
      (Number(this.cBText.value) / 100) * 0.4,
      Number(this.cCText.value)
    );
  }

  /**
   * Set the color of this input method.
   *
   * @param color An instance of ``ColorizerColor``.
   */
  public setColor(color: ColorizerColor): void {
    const colorOklch = color.toOklchString();

    this.cAText.value = colorOklch.l;
    this.cASlider.value = colorOklch.l;
    this.updateCoordinateInStyleProperty(this.cAProperty, colorOklch.l);

    this.cBText.value = colorOklch.c;
    this.cBSlider.value = colorOklch.c;
    this.updateCoordinateInStyleProperty(this.cBProperty, colorOklch.c);

    this.cCText.value = colorOklch.h;
    this.cCSlider.value = colorOklch.h;
    this.updateCoordinateInStyleProperty(this.cCProperty, colorOklch.h);
  }
}

/**
 * Represent HSL color input.
 *
 * @param receiver A callback function that is called whenever the input
 *                 method's current color changes.
 * @param inputDebounceDelay The delay to be applied to the method's input
 *                           event handlers, given in **ms** and passed to
 *                           ``setTimeout()``. **Optional**, will get a default
 *                           value of ``500`` in ``ColorizerFormInputMethod``.
 */
class ColorizerFormInputHsl
  extends ColorizerFormInputMethod
  implements IColorizerFormInputMethod
{
  constructor(
    receiver: TColorizerFormReceiverCallback,
    inputDebounceDelay?: number
  ) {
    // cA = hue component
    // cB = saturation component
    // cC = light component
    super(
      "#color-form-hsl",
      ".component-hue",
      "--this-hue",
      ".component-saturation",
      "--this-saturation",
      ".component-light",
      "--this-light",
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
   * actual numbers by calling ``Number()`` on them. Forcing them into the
   * required ranges (e.g. into range [0..1]) is done in
   * ``ColorizerColor.fromHsl()``.
   */
  public getColor(): ColorizerColor {
    return ColorizerColor.fromHsl(
      Number(this.cAText.value),
      Number(this.cBText.value) / 100,
      Number(this.cCText.value) / 100
    );
  }

  /**
   * Set the color of this input method.
   *
   * @param color An instance of ``ColorizerColor``.
   */
  public setColor(color: ColorizerColor): void {
    const colorHsl = color.toHslString();

    this.cAText.value = colorHsl.h;
    this.cASlider.value = colorHsl.h;
    this.updateCoordinateInStyleProperty(this.cAProperty, colorHsl.h);

    this.cBText.value = colorHsl.s;
    this.cBSlider.value = colorHsl.s;
    this.updateCoordinateInStyleProperty(this.cBProperty, colorHsl.s);

    this.cCText.value = colorHsl.l;
    this.cCSlider.value = colorHsl.l;
    this.updateCoordinateInStyleProperty(this.cCProperty, colorHsl.l);
  }
}

/**
 * Represent HWB color input.
 *
 * @param receiver A callback function that is called whenever the input
 *                 method's current color changes.
 * @param inputDebounceDelay The delay to be applied to the method's input
 *                           event handlers, given in **ms** and passed to
 *                           ``setTimeout()``. **Optional**, will get a default
 *                           value of ``500`` in ``ColorizerFormInputMethod``.
 */
class ColorizerFormInputHwb
  extends ColorizerFormInputMethod
  implements IColorizerFormInputMethod
{
  constructor(
    receiver: TColorizerFormReceiverCallback,
    inputDebounceDelay?: number
  ) {
    // cA = hue component
    // cB = white component
    // cC = black component
    super(
      "#color-form-hwb",
      ".component-hue",
      "--this-hue",
      ".component-white",
      "--this-white",
      ".component-black",
      "--this-black",
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
   * actual numbers by calling ``Number()`` on them. Forcing them into the
   * required ranges (e.g. into range [0..1]) is done in
   * ``ColorizerColor.fromHwb()``.
   */
  public getColor(): ColorizerColor {
    return ColorizerColor.fromHwb(
      Number(this.cAText.value),
      Number(this.cBText.value) / 100,
      Number(this.cCText.value) / 100
    );
  }

  /**
   * Set the color of this input method.
   *
   * @param color An instance of ``ColorizerColor``.
   */
  public setColor(color: ColorizerColor): void {
    const colorHwb = color.toHwbString();

    this.cAText.value = colorHwb.h;
    this.cASlider.value = colorHwb.h;
    this.updateCoordinateInStyleProperty(this.cAProperty, colorHwb.h);

    this.cBText.value = colorHwb.w;
    this.cBSlider.value = colorHwb.w;
    this.updateCoordinateInStyleProperty(this.cBProperty, colorHwb.w);

    this.cCText.value = colorHwb.b;
    this.cCSlider.value = colorHwb.b;
    this.updateCoordinateInStyleProperty(this.cCProperty, colorHwb.b);
  }
}
