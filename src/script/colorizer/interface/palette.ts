// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerColor } from "../lib/color";
import { getDomElement, mHash } from "../../utility";
import type {
  IColorizerPaletteObservable,
  IColorizerPaletteObserver,
} from "../lib/types";

/**
 * Represent a single color of the application's palette.
 *
 * While the internal representation of actual colors is provided by instances
 * of ``ColorizerColor``, this class adds more meta information, including
 * an instance's *unique identifier* (``paletteItemId``) and its *sorting*
 * in the overall palette (``sorting``).
 *
 * @param color An instance of ``ColorizerColor``, providing the actual color
 *              information.
 * @param sorting An **optional** parameter, setting the value of the
 *                ``sorting`` attribute. Default: ``999``.
 * @param paletteItemId An **optional** parameter, setting the value of the
 *                      ``paletteItemId`` attribute. If not specified, the
 *                      instance's *unique identifier* is determined using
 *                      the app-specific ``mHash()`` function with a string
 *                      generated from the ``x``, ``y`` and ``z`` attributes
 *                      of the ``color`` parameter.
 */
export class ColorizerPaletteItem {
  private _color: ColorizerColor;
  private _paletteItemId: string;
  private sorting: number;

  public constructor(
    color: ColorizerColor,
    sorting?: number,
    paletteItemId?: string
  ) {
    this._color = color;

    if (sorting !== undefined) {
      this.sorting = sorting;
    } else {
      this.sorting = 999;
    }

    if (paletteItemId !== undefined) {
      this._paletteItemId = paletteItemId;
    } else {
      const tmp = color.toJSON();
      this._paletteItemId = mHash(`${tmp.x}-${tmp.y}-${tmp.z}`);
    }

    console.debug(this._color);
    console.debug(this.sorting);
    console.debug(this.paletteItemId);
  }

  /**
   * Return the color of the instance.
   *
   * @returns The color as ``ColorizerColor`` instance.
   */
  public get color(): ColorizerColor {
    return this._color;
  }

  public get paletteItemId(): string {
    return this._paletteItemId;
  }
}

export class ColorizerPalette
  implements IColorizerPaletteObservable, IColorizerPaletteObserver
{
  private paletteObservers: IColorizerPaletteObserver[] = [];
  private _palette: ColorizerPaletteItem[] = [];

  private paletteContainer: HTMLElement;
  private paletteList: HTMLUListElement;

  public constructor() {
    console.debug("Initializing ColorizerPalette");

    this.paletteContainer = <HTMLElement>getDomElement(null, "#color-palette");
    this.paletteList = <HTMLUListElement>(
      getDomElement(this.paletteContainer, "ul")
    );

    this.addPaletteObserver(this);
  }

  /**
   * Return the actual palette.
   *
   * @returns The internal palette.
   */
  public get palette(): ColorizerPaletteItem[] {
    return this._palette;
  }

  /**
   * Add a color to the palette.
   *
   * @param color An instance of ``ColorizerColor``.
   *
   * This method is meant to be attached to an instance of ``ColorizerForm`` as
   * its ``submitCallback``. Thus, this function **must** follow the type
   * definition of ``TColorizerFormSubmitCallback``.
   *
   * Internally, this relies on ``addPaletteItem()`` and the function will
   * notify the instance's observers (by ``notifyPaletteObservers()``).
   */
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
    this._palette.push(new ColorizerPaletteItem(color, sorting, paletteItemId));
  }

  /**
   * Perform actions on palette updates.
   *
   * @param palette The updated/changed palette.
   *
   * This class implements both parts of the *Observer* pattern. This is the
   * **Observer** part.
   */
  public update(palette: ColorizerPaletteItem[]): void {
    console.debug(palette);

    // empty the existing palette to prevent duplicates
    while (this.paletteList.firstChild) {
      this.paletteList.removeChild(this.paletteList.firstChild);
    }

    if (palette.length < 1) {
      return;
    }

    for (let i = 0; i < palette.length; i++) {
      this.paletteList.appendChild(
        this.generatePaletteItemForDom(<ColorizerPaletteItem>palette[i])
      );
    }
  }

  /**
   */
  private generatePaletteItemForDom(item: ColorizerPaletteItem): HTMLLIElement {
    const template = <HTMLTemplateElement>(
      document.getElementById("tpl-palette-item")
    );

    const paletteItem = (
      template.content.firstElementChild as HTMLLIElement
    ).cloneNode(true) as HTMLLIElement;

    const paletteItemColor = item.color.toJSON();

    paletteItem.setAttribute("palette-item-id", item.paletteItemId);
    paletteItem.style.cssText = `--palette-item-color-x: ${paletteItemColor.x}; --palette-item-color-y: ${paletteItemColor.y}; --palette-item-color-z: ${paletteItemColor.z};`;

    // TODO: This needs more attention!
    const label = <HTMLDivElement>getDomElement(paletteItem, ".label");
    label.innerHTML = item.paletteItemId;

    return paletteItem;
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
      console.debug(item.color);
    });

    this.paletteObservers.forEach((obs) => {
      obs.update(this.palette);
    });
  }
}
