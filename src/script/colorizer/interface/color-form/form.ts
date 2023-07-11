// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getColorizerFormInput } from "./input-methods";
import { ColorizerColor } from "../../lib/color";
import { getDomElement } from "../../../utility";
import type { TColorizerFormInputMethod } from "./input-methods";
import type {
  IColorizerColorObserver,
  IColorizerColorObservable,
} from "../../lib/types";

/**
 * Prototype of the ``ColorizerForm.receiveColor()`` method.
 *
 * This is used for type safety in the ``input-methods`` module.
 *
 * Please note: While this is identical to ``TColorizerFormSubmitCallback``,
 * these types are semantically different!
 */
export type TColorizerFormReceiverCallback = (color: ColorizerColor) => void;

/**
 * Prototype of the callback that is to be executed on submitting the form.
 *
 * This is used for type safety.
 *
 * Please note: While this is identical to ``TColorizerFormReceiverCallback``,
 * these types are semantically different!
 */
export type TColorizerFormSubmitCallback = (color: ColorizerColor) => void;

/**
 * Application-specific representation of the ``<form ...>`` to add new colors.
 *
 * This class takes care of adding new colors through various *input methods*,
 * representing different color spaces / notations (e.g. sRGB, OkLCH, ...).
 * Instances will take care of managing the various input methods by setting
 * up the corresponding classes (children of ``ColorizerFormInputMethod``) and
 * keeping them in sync.
 *
 * Submitting the form will trigger the execution of a callback function that
 * must be provided during instantiation of the class (``submitCallback``).
 *
 * Instances of this class are acting as the *Subject* in the Observer pattern
 * implementation (implementing ``IColorizerColorObservable``).
 */
export class ColorizerForm implements IColorizerColorObservable {
  private formContainer: HTMLElement;
  private form: HTMLFormElement;

  // Initialization of color **is done** in the ``constructor()`` by calling
  // ``receiveColor()``.
  //
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: strictPropertyInitialization
  private color: ColorizerColor;

  // Part of the implementation of the Observer pattern, required to make
  // ``IColorizerColorObservable`` work.
  // This is the list of *Observers*.
  private colorObservers: IColorizerColorObserver[] = [];

  // This function is to be executed, when the ``<form ...>`` is submitted.
  //
  // Internally this is wrapped in ``submit()``, allowing additional
  // sanitization / validation of the values. And yes, I'm aware that
  // validation in (client) script code does not make sense. Assuming that the
  // user actually wants to use the application and data is actually only
  // stored on the user's machine, this is *meh*. (;
  //
  // There is another place for input validation in
  // ``ColorizerFormInputMethod.publishColor()``.
  //
  // Ref: https://developer.mozilla.org/en-US/docs/Learn/Forms/Form_validation#validating_forms_using_javascript
  private submitCallback: TColorizerFormSubmitCallback;

  constructor(
    inputMethods: TColorizerFormInputMethod[],
    submitCallback: TColorizerFormSubmitCallback
  ) {
    // Store elemental values in the instance
    this.submitCallback = submitCallback;

    // Get DOM elements
    this.formContainer = <HTMLElement>(
      getDomElement(null, "#panel-root-color-form")
    );
    this.form = <HTMLFormElement>getDomElement(null, "#color-form");
    const notationsToggleContainer = <HTMLUListElement>(
      getDomElement(this.formContainer, ".notations-toggles")
    );
    const descriptionToggleButton = <HTMLButtonElement>(
      getDomElement(this.formContainer, "#form-description-toggle")
    );

    // Setup the available input methods and keep track of them
    inputMethods.forEach((m) => {
      const tmpMethod = getColorizerFormInput(m, this.receiveColor.bind(this));
      this.addColorObserver(tmpMethod);
      this.form.insertBefore(tmpMethod.fieldset, this.form.lastElementChild);

      const tmpButton = this.generateNotationToggle(m);
      const tmpLi = document.createElement("li");
      tmpLi.appendChild(tmpButton);

      notationsToggleContainer.appendChild(tmpLi);
    });

    // Set an initial color for the form and all input methods
    this.receiveColor(ColorizerColor.fromRgb(0, 0, 0));

    // Attach the event handler for submitting the ``<form ...>``
    this.form.addEventListener("submit", this.submit.bind(this));
    this.form.addEventListener("reset", (evt) => {
      evt.preventDefault();

      this.receiveColor(ColorizerColor.fromRgb(0, 0, 0));
    });

    // Provide the internal logic for the description button
    descriptionToggleButton.addEventListener("click", (evt) => {
      evt.preventDefault();
      evt.stopPropagation();

      const currentStatus = (
        evt.currentTarget as HTMLButtonElement
      ).getAttribute("aria-pressed");
      if (currentStatus === null) {
        return;
      }

      const disclosureContent = this.formContainer.querySelectorAll(
        ".disclosure-content"
      );
      disclosureContent.forEach((elem) => {
        if (currentStatus === "false") {
          (elem as HTMLElement).classList.remove("hide-disclosure");
        } else {
          (elem as HTMLElement).classList.add("hide-disclosure");
        }
      });

      if (currentStatus === "false") {
        (evt.currentTarget as HTMLButtonElement).setAttribute(
          "aria-pressed",
          "true"
        );
      } else {
        (evt.currentTarget as HTMLButtonElement).setAttribute(
          "aria-pressed",
          "false"
        );
      }
    });
  }

  /**
   * Return the current color.
   *
   * This method allows external code to *pull* the current color of the
   * ``<form ...>``.
   */
  public getColor(): ColorizerColor {
    return this.color;
  }

  /**
   * Add an *Observer* to the form.
   *
   * @param obs The *Observer* to attach. Must implement the
   *            ``IColorizerColorObserver`` interface!
   *
   * This is part of the implementation of the Observer pattern, required by
   * ``IColorizerColorObservable``.
   */
  public addColorObserver(obs: IColorizerColorObserver): void {
    const obsIndex = this.colorObservers.indexOf(obs);
    if (obsIndex !== -1) {
      console.warn("That observer is already attached!");
      return;
    }

    this.colorObservers.push(obs);
  }

  /**
   * Remove an *Observer* from the form.
   *
   * @param obs The *Observer* to remove. Must implement the
   *            ``IColorizerColorObserver`` interface!
   *
   * This is part of the implementation of the Observer pattern, required by
   * ``IColorizerColorObservable``.
   */
  public removeColorObserver(obs: IColorizerColorObserver): void {
    // const obsIndex = this.colorObservers.indexOf(obs);
    // if (obsIndex === -1) {
    //   console.warn("That observer does not exist!");
    //   return;
    // }

    // this.colorObservers.splice(obsIndex, 1);
    // console.info("Observer removed successfully");
    console.error(obs);
    throw new Error(`[BAM] Now go implement this!`);
  }

  /**
   * Notify the *Observers* and provide the current ``color``.
   *
   * This is part of the implementation of the Observer pattern. It is
   * **not required** by ``IColorizerColorObservable``, as it is not part of the
   * interface's *contract*, but it is obviously required to make the Observer
   * pattern work.
   *
   * While this could be handled in ``receiveColor()``, it is kept in a
   * dedicated method for clarity.
   */
  private notifyColorObservers(): void {
    this.colorObservers.forEach((obs) => {
      obs.updateColor(this.color);
    });
  }

  /**
   * Receive a ``color`` from one of the input methods.
   *
   * While setting up the different input methods using
   * ``getColorizerFormInput()``, this method is provided as callback function.
   * It is then used by concrete children of ``ColorizerFormInputMethod`` to
   * update the parent form, which is the *Subject* in an Observer pattern
   * implementation, notifying all *Observers* (including the input methods to
   * keep them in sync).
   *
   * Internally, this relies on ``notifyColorObservers()``.
   */
  private receiveColor(color: ColorizerColor): void {
    this.color = color;

    // Update the color of all available input methods
    this.notifyColorObservers();
  }

  /**
   * Handle *Submit Events*.
   *
   * As of now, this simply calls the ``submitCallback`` function with the
   * current ``color``.
   *
   * This handler **does** prevent the ``<form ...>``'s default action **and**
   * stops the bubbling of the event upwards.
   */
  private submit(evt: Event): void {
    evt.preventDefault();
    evt.stopPropagation();

    this.submitCallback(this.color);
  }

  private toggleNotationButtonEventHandler(evt: Event): void {
    evt.preventDefault();
    evt.stopPropagation();

    const notation = (evt.currentTarget as HTMLElement).getAttribute(
      "colorizer-notation"
    );
    if (notation === null) {
      return;
    }

    const currentStatus = (evt.currentTarget as HTMLButtonElement).getAttribute(
      "aria-pressed"
    );
    if (currentStatus === null) {
      return;
    }

    // Note: This makes a **hard assumption** about an implementation detail
    //       of the actual input methods!
    //       The ``id`` attribute is determined dynamically during class
    //       initialization of the input method.
    //
    //       This is not really considered an issue, because the input methods
    //       are logically linked to the overall form anyways.
    const inputMethod = <HTMLFieldSetElement>(
      getDomElement(this.form, `#color-form-${notation}`)
    );
    if (currentStatus === "false") {
      (evt.currentTarget as HTMLButtonElement).setAttribute(
        "aria-pressed",
        "true"
      );
      inputMethod.classList.remove("hide-notation");
    } else {
      (evt.currentTarget as HTMLButtonElement).setAttribute(
        "aria-pressed",
        "false"
      );
      inputMethod.classList.add("hide-notation");
    }
  }

  private generateNotationToggle(notation: string): HTMLButtonElement {
    const template = <HTMLTemplateElement>(
      getDomElement(null, "#tpl-toggle-button")
    );

    const toggleButton = (
      template.content.firstElementChild as HTMLButtonElement
    ).cloneNode(true) as HTMLButtonElement;
    toggleButton.setAttribute("colorizer-notation", notation);
    toggleButton.addEventListener(
      "click",
      this.toggleNotationButtonEventHandler.bind(this)
    );

    const label = <HTMLSpanElement>getDomElement(toggleButton, ".text-wrapper");
    label.innerHTML = notation;

    return toggleButton;
  }
}
