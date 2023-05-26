// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getColorFormInput, TColorFormInputMethod } from "./input-methods";
import { ColorizerColor } from "../../lib/color";
import { IColorizerObserver, IColorizerSubject } from "../../lib/types";
import { getDomElement } from "../../../utility";

/**
 * Prototype of the ``ColorForm.receiveColor()`` method.
 *
 * This is used for type safety in the ``input-methods`` module.
 *
 * Please note: While this is identical to ``TColorFormSubmitCallback``, these
 * types are semantically different!
 */
export type TColorFormReceiverCallback = (color: ColorizerColor) => void;

/**
 * Prototype of the callback that is to be executed on submitting the form.
 *
 * This is used for type safety.
 *
 * Please note: While this is identical to ``TColorFormReceiverCallback``,
 * these types are semantically different!
 */
export type TColorFormSubmitCallback = (color: ColorizerColor) => void;

export class ColorForm implements IColorizerSubject {
  private form: HTMLFormElement;

  // Initialization of color **is done** in the ``constructor()`` by calling
  // ``receiveColor()``.
  //
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: strictPropertyInitialization
  private color: ColorizerColor;

  // Part of the implementation of the Observer pattern, required to make
  // ``IColorizerSubject`` work.
  // This is the list of *Observers*.
  private colorObservers: IColorizerObserver[] = [];

  // This function is to be executed, when the ``<form ...>`` is submitted.
  //
  // Internally this is wrapped in ``submit()``, allowing additional
  // sanitization / validation of the values. And yes, I'm aware that
  // validation in (client) script code does not make sense. Assuming that the
  // user actually wants to use the application and data is actually only
  // stored on the user's machine, this is *meh*. (;
  private submitCallback: TColorFormSubmitCallback;

  constructor(
    inputMethods: TColorFormInputMethod[],
    submitCallback: TColorFormSubmitCallback
  ) {
    // Store elemental values in the instance
    this.submitCallback = submitCallback;

    // Get DOM elements
    this.form = <HTMLFormElement>getDomElement(null, "#color-form");

    // Setup the available input methods and keep track of them
    inputMethods.forEach((m) => {
      this.addColorObserver(getColorFormInput(m, this.receiveColor.bind(this)));
    });

    // Set an initial color for the form and all input methods
    this.receiveColor(ColorizerColor.fromRgb(0, 0, 0));

    // Attach the event handler for submitting the ``<form ...>``
    this.form.addEventListener("submit", this.submit.bind(this));
  }

  public getColor(): ColorizerColor {
    return this.color;
  }

  /**
   * Add an *Observer* to the form.
   *
   * @param obs The *Observer* to attach. Must implement the
   *            ``IColorizerObserver`` interface!
   *
   * This is part of the implementation of the Observer pattern, required by
   * ``IColorizerSubject``.
   */
  public addColorObserver(obs: IColorizerObserver): void {
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
   *            ``IColorizerObserver`` interface!
   *
   * This is part of the implementation of the Observer pattern, required by
   * ``IColorizerSubject``.
   *
   * TODO: Is this really required? As of now, the application's flow does not
   *       require *removing of Observers*.
   */
  public removeColorObserver(obs: IColorizerObserver): void {
    const obsIndex = this.colorObservers.indexOf(obs);
    if (obsIndex === -1) {
      console.warn("That observer does not exist!");
      return;
    }

    this.colorObservers.splice(obsIndex, 1);
    console.info("Observer removed successfully");
  }

  /**
   * Notify the *Observers* and provide the current ``color``.
   *
   * This is part of the implementation of the Observer pattern. It is
   * **not required** by ``IColorizerSubject``, as it is not part of the
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

  // TODO: Heavily work in progress here!
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
}
