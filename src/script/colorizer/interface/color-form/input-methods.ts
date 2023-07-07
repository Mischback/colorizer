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
export type TColorizerFormInputMethod = Exclude<TColorizerColorNotation, "xyz">;

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
 * The required parameters to create the ``<input>`` elements of a single
 * component.
 */
type TColorizerFormInputMethodComponentConfig = {
  componentCaption: string;
  componentCssClass: string;
  componentCssProperty: string;
  textInputPattern: string;
  textInputMode: string;
  textInputLabelText: string;
  sliderMin: number;
  sliderMax: number;
  sliderStep: number;
  sliderLabelText: string;
};

/**
 * The components of an input method are associated with different ``<input>``
 * elements and have a corresponding ``cssProperty``.
 */
type TColorizerFormInputMethodComponentStore = {
  textInput: HTMLInputElement;
  sliderInput: HTMLInputElement;
  cssProperty: string;
};

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
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Unknown input method '${method}'`);
  }
}

/**
 * Base class for alle input methods.
 *
 * @param receiver A callback function that is called whenever the input
 *                 method's current color changes.
 * @param inputDebounceDelay The delay to be applied to the method's input
 *                           event handlers, given in **ms** and passed to
 *                           ``setTimeout()``. Default: ``500``.
 *
 * This class provides the implementations for the generic, method-unrelated,
 * repetitive tasks. It creates the required DOM elements and keeps them in
 * sync and handles publishing the color to the parent ``<form>`` element.
 */
abstract class ColorizerFormInputMethod
  implements IColorizerFormInputMethod, IColorizerColorObserver
{
  // @ts-expect-error TS2564 Initializer in child classes
  protected _fieldset: HTMLFieldSetElement;
  private inputReceiver: TColorizerFormReceiverCallback;
  private inputDebounceDelay: number;
  protected components = new Map<
    string,
    TColorizerFormInputMethodComponentStore
  >();

  public abstract getColor(): ColorizerColor;
  public abstract setColor(color: ColorizerColor): void;

  constructor(
    receiver: TColorizerFormReceiverCallback,
    inputDebounceDelay = 500
  ) {
    // Store elemental values in the instance
    this.inputReceiver = receiver;
    this.inputDebounceDelay = inputDebounceDelay;
  }

  /**
   * Get the ``<fieldset>`` element of this input method.
   */
  public get fieldset(): HTMLFieldSetElement {
    return this._fieldset;
  }

  /**
   * Create the overall ``<fieldset>`` element and populate it with the
   * required *components*.
   *
   * @param method A string defining the *input method*. Will be applied in
   *               several ``id`` attributes, so it **has to be** unique for
   *               every concrete *input method* implementation.
   * @param methodCaption The caption of this *input method's* ``<fieldset>``
   *                      element, provided in its ``<legend>``. To keep the
   *                      ``<form>`` as accessible as possible, this
   *                      *should be* unique for every *input method*
   *                      implementation.
   * @param components An array of components to be created. Each entry in this
   *                   array **must** consist of an *ID* (which **must be**
   *                   unique for the component in the *input method*) and the
   *                   corresponding configuration object (of type
   *                   ``TColorizerFormInputMethodComponentConfig``). The
   *                   configuration object will be passed to
   *                   ``setupComponent()``.
   * @returns The input method's ``<fieldset>`` DOM element.
   *
   * Internally, this method uses ``setupComponent()`` to create the actual
   * ``<input>`` elements for the *input method's* components, e.g. it creates
   * dedicated R, G and B components for RGB input.
   *
   * Note: This method is *protected*, as it will be called from the concrete
   * child classes rather than from this class!
   */
  protected setupDomElements(
    method: TColorizerFormInputMethod,
    methodCaption: string,
    components: {
      componentId: string;
      config: TColorizerFormInputMethodComponentConfig;
    }[]
  ): HTMLFieldSetElement {
    // Setup the input method **overall template**
    const template = <HTMLTemplateElement>(
      getDomElement(null, "#tpl-input-method")
    );

    const methodDom = (
      template.content.firstElementChild as HTMLFieldSetElement
    ).cloneNode(true) as HTMLFieldSetElement;
    methodDom.setAttribute("id", `color-form-${method}`);

    // This ``<span>`` is inside of ``<legend>``
    const caption = <HTMLSpanElement>(
      getDomElement(methodDom, ".method-caption")
    );
    caption.innerHTML = methodCaption;

    components.forEach((comp) => {
      methodDom.appendChild(
        this.setupComponent(method, comp.componentId, comp.config)
      );
    });

    // Attach event listener for publishing the current color.
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
    methodDom.addEventListener(
      "input",
      (this.constructor as typeof ColorizerFormInputMethod).debounceInput(
        this,
        this.publishColor,
        this.inputDebounceDelay
      )
    );
    /* eslint-enable @typescript-eslint/unbound-method */

    return methodDom;
  }

  /**
   * Create the required ``<input>`` elements for a single component.
   *
   * @param method A string defining the *input method*. Will be applied in
   *               several ``id`` attributes, so it **has to be** unique for
   *               every concrete *input method* implementation.
   * @param componentId A string defining the component. Will be applied in
   *                    ``id`` attributes, so it **has to be** unique for the
   *                    *input method*.
   * @param config The config object for this component.
   * @returns A ``<fieldset>`` element, containing the (related) ``<input>``
   *          elements, ready for further use.
   *
   * The method creates/populates the required ``<input>`` elements, usually
   * for every component there is a text-based input and a slider-based input.
   * Both ``<input>`` elements are kept in sync.
   */
  private setupComponent(
    method: TColorizerFormInputMethod,
    componentId: string,
    config: TColorizerFormInputMethodComponentConfig
  ): HTMLFieldSetElement {
    const template = <HTMLTemplateElement>(
      getDomElement(null, "#tpl-input-method-component")
    );

    const component = (
      template.content.firstElementChild as HTMLFieldSetElement
    ).cloneNode(true) as HTMLFieldSetElement;
    component.classList.add(config.componentCssClass);

    const caption = <HTMLLegendElement>getDomElement(component, "legend");
    caption.innerHTML = config.componentCaption;

    const sliderLabel = <HTMLLabelElement>(
      getDomElement(component, "label[for=slider]")
    );
    sliderLabel.setAttribute(
      "for",
      `color-form-${method}-${componentId}-slider`
    );
    sliderLabel.innerHTML = config.sliderLabelText;

    const slider = <HTMLInputElement>(
      getDomElement(component, "input[type=range]")
    );
    slider.setAttribute("id", `color-form-${method}-${componentId}-slider`);
    slider.setAttribute("min", config.sliderMin.toString());
    slider.setAttribute("max", config.sliderMax.toString());
    slider.setAttribute("step", config.sliderStep.toString());

    const textLabel = <HTMLLabelElement>(
      getDomElement(component, "label[for=text]")
    );
    textLabel.setAttribute("for", `color-form-${method}-${componentId}`);
    textLabel.innerHTML = config.textInputLabelText;

    const text = <HTMLInputElement>getDomElement(component, "input[type=text]");
    text.setAttribute("id", `color-form-${method}-${componentId}`);
    text.setAttribute("pattern", config.textInputPattern);
    text.setAttribute("inputmode", config.textInputMode);

    slider.addEventListener("input", (evt) => {
      // **MUST NOT** stop event propagation because the overall method's
      // ``publishColor()`` is attached to the overall ``<fieldset>`` element.
      const val = Number(
        (evt.currentTarget as HTMLInputElement).value
      ).toString();
      this.setComponentValue(componentId, val);
    });

    text.addEventListener("input", (evt) => {
      // **MUST NOT** stop event propagation because the overall method's
      // ``publishColor()`` is attached to the overall ``<fieldset>`` element.
      const val = Number(
        (evt.currentTarget as HTMLInputElement).value
      ).toString();
      this.setComponentValue(componentId, val);
    });

    this.components.set(componentId, {
      textInput: text,
      sliderInput: slider,
      cssProperty: config.componentCssProperty,
    });

    return component;
  }

  /**
   * Updates all elements related to a component.
   *
   * @param componentId
   * @param value The new value, provided as string!
   */
  protected setComponentValue(componentId: string, value: string): void {
    const compStore = this.components.get(componentId);
    if (compStore === undefined) {
      console.warn(`No component with id '${componentId}'`);
      return;
    }

    compStore.textInput.value = value;
    compStore.sliderInput.value = value;
    this.updateCoordinateInStyleProperty(compStore.cssProperty, value);
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
    this._fieldset.style.setProperty(propertyName, value);
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
    super(receiver, inputDebounceDelay);

    this._fieldset = this.setupDomElements("rgb", "RGB input", [
      {
        componentId: "r",
        config: {
          componentCaption: "Red Component",
          componentCssClass: "rgb-r",
          componentCssProperty: "--rgb-r",
          textInputPattern: "^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$",
          textInputMode: "numeric",
          textInputLabelText:
            "Decimal input for red component in range 0 to 255",
          sliderMin: 0,
          sliderMax: 255,
          sliderStep: 1,
          sliderLabelText: "Slider to adjust the red component",
        },
      },
      {
        componentId: "g",
        config: {
          componentCaption: "Green Component",
          componentCssClass: "rgb-g",
          componentCssProperty: "--rgb-g",
          textInputPattern: "^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$",
          textInputMode: "numeric",
          textInputLabelText:
            "Decimal input for green component in range 0 to 255",
          sliderMin: 0,
          sliderMax: 255,
          sliderStep: 1,
          sliderLabelText: "Slider to adjust the green component",
        },
      },
      {
        componentId: "b",
        config: {
          componentCaption: "Blue Component",
          componentCssClass: "rgb-b",
          componentCssProperty: "--rgb-b",
          textInputPattern: "^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$",
          textInputMode: "numeric",
          textInputLabelText:
            "Decimal input for blue component in range 0 to 255",
          sliderMin: 0,
          sliderMax: 255,
          sliderStep: 1,
          sliderLabelText: "Slider to adjust the blue component",
        },
      },
    ]);
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
    const r = this.components.get("r");
    const g = this.components.get("g");
    const b = this.components.get("b");

    if (r === undefined || g === undefined || b === undefined) {
      throw new Error("A required component is 'undefined'");
    }

    return ColorizerColor.fromRgb255(
      Number(r.textInput.value),
      Number(g.textInput.value),
      Number(b.textInput.value)
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
    this.setComponentValue("r", tmp);

    tmp = color255.g.toString();
    this.setComponentValue("g", tmp);

    tmp = color255.b.toString();
    this.setComponentValue("b", tmp);
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
    super(receiver, inputDebounceDelay);

    this._fieldset = this.setupDomElements("hsl", "HSL input", [
      {
        componentId: "h",
        config: {
          componentCaption: "Hue Component",
          componentCssClass: "hsl-h",
          componentCssProperty: "--hsl-h",
          textInputPattern:
            "^(NaN|360|((3[0-5][0-9]|[12][0-9]{2}|([1-9]?[0-9]{1}))(.[0-9]+)?))$",
          textInputMode: "numeric",
          textInputLabelText:
            "Decimal input for hue component in range 0 to 360",
          sliderMin: 0,
          sliderMax: 360,
          sliderStep: 1,
          sliderLabelText: "Slider to adjust the hue component",
        },
      },
      {
        componentId: "s",
        config: {
          componentCaption: "Saturation Component",
          componentCssClass: "hsl-s",
          componentCssProperty: "--hsl-s",
          textInputPattern: "^(100|[1-9]?[0-9](.[0-9]+)?)$",
          textInputMode: "numeric",
          textInputLabelText:
            "Decimal input for saturation component in range 0% to 100%",
          sliderMin: 0,
          sliderMax: 100,
          sliderStep: 0.01,
          sliderLabelText: "Slider to adjust the saturation component",
        },
      },
      {
        componentId: "l",
        config: {
          componentCaption: "Lightness Component",
          componentCssClass: "hsl-l",
          componentCssProperty: "--hsl-l",
          textInputPattern: "^(100|[1-9]?[0-9](.[0-9]+)?)$",
          textInputMode: "numeric",
          textInputLabelText:
            "Decimal input for lightness component in range 0% to 100%",
          sliderMin: 0,
          sliderMax: 100,
          sliderStep: 0.01,
          sliderLabelText: "Slider to adjust the lightness component",
        },
      },
    ]);
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
    const h = this.components.get("h");
    const s = this.components.get("s");
    const l = this.components.get("l");

    if (h === undefined || s === undefined || l === undefined) {
      throw new Error("A required component is 'undefined'");
    }

    return ColorizerColor.fromHsl(
      Number(h.textInput.value),
      Number(s.textInput.value) / 100,
      Number(l.textInput.value) / 100
    );
  }

  /**
   * Set the color of this input method.
   *
   * @param color An instance of ``ColorizerColor``.
   */
  public setColor(color: ColorizerColor): void {
    const colorHsl = color.toHslString();

    this.setComponentValue("h", colorHsl.h);
    this.setComponentValue("s", colorHsl.s);
    this.setComponentValue("l", colorHsl.l);
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
    super(receiver, inputDebounceDelay);

    this._fieldset = this.setupDomElements("hwb", "HWB input", [
      {
        componentId: "h",
        config: {
          componentCaption: "Hue Component",
          componentCssClass: "hwb-h",
          componentCssProperty: "--hwb-h",
          textInputPattern:
            "^(NaN|360|((3[0-5][0-9]|[12][0-9]{2}|([1-9]?[0-9]{1}))(.[0-9]+)?))$",
          textInputMode: "numeric",
          textInputLabelText:
            "Decimal input for hue component in range 0 to 360",
          sliderMin: 0,
          sliderMax: 360,
          sliderStep: 1,
          sliderLabelText: "Slider to adjust the hue component",
        },
      },
      {
        componentId: "w",
        config: {
          componentCaption: "Whiteness Component",
          componentCssClass: "hwb-w",
          componentCssProperty: "--hwb-w",
          textInputPattern: "^(100|[1-9]?[0-9](.[0-9]+)?)$",
          textInputMode: "numeric",
          textInputLabelText:
            "Decimal input for whiteness component in range 0% to 100%",
          sliderMin: 0,
          sliderMax: 100,
          sliderStep: 0.01,
          sliderLabelText: "Slider to adjust the whiteness component",
        },
      },
      {
        componentId: "b",
        config: {
          componentCaption: "Blackness Component",
          componentCssClass: "hwb-b",
          componentCssProperty: "--hwb-b",
          textInputPattern: "^(100|[1-9]?[0-9](.[0-9]+)?)$",
          textInputMode: "numeric",
          textInputLabelText:
            "Decimal input for blackness component in range 0% to 100%",
          sliderMin: 0,
          sliderMax: 100,
          sliderStep: 0.01,
          sliderLabelText: "Slider to adjust the blackness component",
        },
      },
    ]);
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
    const h = this.components.get("h");
    const w = this.components.get("w");
    const b = this.components.get("b");

    if (h === undefined || w === undefined || b === undefined) {
      throw new Error("A required component is 'undefined'");
    }
    return ColorizerColor.fromHwb(
      Number(h.textInput.value),
      Number(w.textInput.value) / 100,
      Number(b.textInput.value) / 100
    );
  }

  /**
   * Set the color of this input method.
   *
   * @param color An instance of ``ColorizerColor``.
   */
  public setColor(color: ColorizerColor): void {
    const colorHwb = color.toHwbString();

    this.setComponentValue("h", colorHwb.h);
    this.setComponentValue("w", colorHwb.w);
    this.setComponentValue("b", colorHwb.b);
  }
}
