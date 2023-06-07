// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerColor } from "../lib/color";
import { mHash } from "../../utility";
import type {
  IColorizerPaletteObservable,
  IColorizerPaletteObserver,
} from "../lib/types";

class ColorizerPaletteItem {
  private color: ColorizerColor;
  private paletteItemId: string;
  private sorting: number;

  public constructor(
    color: ColorizerColor,
    sorting?: number,
    paletteItemId?: string
  ) {
    this.color = color;

    if (sorting !== undefined) {
      this.sorting = sorting;
    } else {
      this.sorting = 999;
    }

    if (paletteItemId !== undefined) {
      this.paletteItemId = paletteItemId;
    } else {
      const tmp = color.toJSON();
      this.paletteItemId = mHash(`${tmp.x}-${tmp.y}-${tmp.z}`);
    }

    console.debug(this.color);
    console.debug(this.sorting);
    console.debug(this.paletteItemId);
  }
}

export class ColorizerPalette implements IColorizerPaletteObservable {
  private paletteObservers: IColorizerPaletteObserver[] = [];
  private palette: ColorizerPaletteItem[] = [];

  public constructor() {
    console.debug("Initializing ColorizerPalette");
  }

  public add(color: ColorizerColor): void {
    console.debug("add()");
    this.addPaletteItem(color);
    this.notifyPaletteObservers();
  }

  private addPaletteItem(
    color: ColorizerColor,
    sorting?: number,
    paletteItemId?: string
  ): void {
    console.debug("addPaletteItem()");
    this.palette.push(new ColorizerPaletteItem(color, sorting, paletteItemId));
  }

  /**
   * Add an *Observer* to the palette.
   *
   * @param obs The *Observer* to attach. Must implement the
   *            ``IColorizerPaletteObserver`` interface!
   *
   * This is part of the implementation of the Observer pattern, required by
   * ``IColorizerPaletteObservable``.
   */
  public addPaletteObserver(obs: IColorizerPaletteObserver): void {
    const obsIndex = this.paletteObservers.indexOf(obs);
    if (obsIndex !== -1) {
      console.warn("That observer is already attached!");
      return;
    }

    this.paletteObservers.push(obs);
  }

  /**
   * Remove an *Observer* from the palette.
   *
   * @param obs The *Observer* to remove. Must implement the
   *            ``IColorizerPaletteObserver`` interface!
   *
   * This is part of the implementation of the Observer pattern, required by
   * ``IColorizerPaletteObservable``.
   */
  public removePaletteObserver(obs: IColorizerPaletteObserver): void {
    // const obsIndex = this.paletteObservers.indexOf(obs);
    // if (obsIndex === -1) {
    //   console.warn("That observer does not exist!");
    //   return;
    // }

    // this.paletteObservers.splice(obsIndex, 1);
    // console.info("Observer removed successfully");
    console.debug(obs);
    throw new Error(`[BAM] Now go implement this!`);
  }

  /**
   * Notify the *Observers* and provide the current ``color``.
   *
   * This is part of the implementation of the Observer pattern. It is
   * **not required** by ``IColorizerPaletteObservable``, as it is not part
   * of the interface's *contract*, but it is obviously required to make the
   * Observer pattern work.
   */
  private notifyPaletteObservers(): void {
    this.palette.forEach((item) => {
      console.debug(item);
    });

    this.paletteObservers.forEach((obs) => {
      obs.update(this);
    });
  }
}
