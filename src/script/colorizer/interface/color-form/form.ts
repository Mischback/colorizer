// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import {
  getColorFormInput,
  IColorFormInputMethod,
  TColorFormInputMethod,
} from "./input-methods";
import { ColorizerColor } from "../../lib/color";
import { IColorizerObserver, IColorizerSubject } from "../../lib/types";
import { getDomElement } from "../../../utility";

// This type describes the ``ColorForm.receiveColor()`` method.
export type TColorFormReceiverCallback = (color: ColorizerColor) => void;

export class ColorForm implements IColorizerSubject {
  private form: HTMLFormElement;
  private inputMethods: IColorFormInputMethod[] = [];

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

  constructor(inputMethods: TColorFormInputMethod[]) {
    this.form = <HTMLFormElement>getDomElement(null, "#color-form");

    // Setup the available input methods and keep track of them
    inputMethods.forEach((m) => {
      this.inputMethods.push(
        getColorFormInput(m, this.receiveColor.bind(this))
      );
    });

    // Set an initial color for the form and all input methods
    this.receiveColor(ColorizerColor.fromRgb(0, 0, 0));

    // TODO: Remove debug statements
    console.debug(this.form);
    console.debug(this.inputMethods);
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
   * @param obs The *Observer* to attach. Must implement the
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
    console.debug("Notifying ColorObservers");
  }

  // TODO: Heavily work in progress here!
  private receiveColor(color: ColorizerColor): void {
    this.color = color;

    // Update the color of all available input methods
    this.notifyColorObservers();

    this.inputMethods.forEach((method) => {
      method.setColor(color);
    });
  }
}
