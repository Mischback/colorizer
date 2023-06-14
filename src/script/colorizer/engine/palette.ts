// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerColor } from "../lib/color";
import { mHash } from "../../utility";
import type { ColorizerDatabase } from "./database";
import type {
  IColorizerPaletteObservable,
  IColorizerPaletteObserver,
} from "../lib/types";

export interface IColorizerPaletteItem {
  paletteItemId: string;
  color: ColorizerColor;
  sorting: number;
}

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
export class ColorizerPaletteItem implements IColorizerPaletteItem {
  private _color: ColorizerColor;
  private _paletteItemId: string;
  private _sorting: number;

  public constructor(
    color: ColorizerColor,
    sorting?: number,
    paletteItemId?: string
  ) {
    this._color = color;

    if (sorting !== undefined) {
      this._sorting = sorting;
    } else {
      this._sorting = 999;
    }

    if (paletteItemId !== undefined) {
      this._paletteItemId = paletteItemId;
    } else {
      const tmp = color.toJSON();
      this._paletteItemId = mHash(`${tmp.x}-${tmp.y}-${tmp.z}`);
    }
  }

  /**
   * Return the color of the instance.
   *
   * @returns The color as ``ColorizerColor`` instance.
   */
  public get color(): ColorizerColor {
    return this._color;
  }

  /**
   * Return the ID of this palette item.
   *
   * @returns The ``_paletteItemId``.
   */
  public get paletteItemId(): string {
    return this._paletteItemId;
  }

  /**
   * Return the sorting value of this palette item in the overall palette.
   */
  public get sorting(): number {
    return this._sorting;
  }

  /**
   * Return a *flat* JSON representation of the object.
   *
   * While this class handles its attributes internally and provides the
   * required ``getters()`` for ``color``, ``paletteItemId`` and ``sorting``,
   * this does not work with IndexedDB's requirements, where the object to be
   * stored **must have** its attributes plainly accessible.
   */
  public toJSON() {
    return {
      paletteItemId: this.paletteItemId,
      color: this.color,
      sorting: this.sorting,
    };
  }
}

export class ColorizerPalette implements IColorizerPaletteObservable {
  private paletteObservers: IColorizerPaletteObserver[] = [];
  private _palette: ColorizerPaletteItem[] = [];
  private db;

  public constructor(dbInstance: ColorizerDatabase) {
    console.debug("Initializing ColorizerPalette");

    this.db = dbInstance;

    // Properly initialize the internal palette from the database.
    void this.synchronizePaletteFromDb();
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
   * Internally, this relies on ``add()`` and the function will
   * notify the instance's observers (by ``notifyPaletteObservers()``).
   */
  public async addColorToPalette(color: ColorizerColor): Promise<void> {
    console.debug("addColorToPalette()");

    await this.add(color);

    this.notifyPaletteObservers();
  }

  private async add(
    color: ColorizerColor,
    sorting?: number,
    paletteItemId?: string
  ): Promise<void> {
    console.debug("add()");

    const paletteItem = new ColorizerPaletteItem(color, sorting, paletteItemId);

    // The paletteItem must be converted to *flat* JSON for IndexedDB.
    await this.db.put("palette", paletteItem.toJSON());

    this._palette.push(paletteItem);
  }

  /**
   * Refresh the palette from the IndexedDB database.
   *
   * The IndexedDB database does not store the *semantic objects*, but *flat
   * JSON objects*. The method creates valid ``ColorizerPaletteItem`` instances
   * from the stored values, re-builds the internal ``_palette`` and will
   * notify the instance's observers (by ``notifyPaletteObservers()``).
   *
   * This is an expensive operation, as all existing instances of
   * ``ColorizerPaletteItem`` are discarded and re-created.
   */
  private async synchronizePaletteFromDb(): Promise<void> {
    const rawDb = await this.db.raw();

    const palette = await rawDb.getAllFromIndex("palette", "sorted");

    // Reset the existing palette
    this._palette = [];
    // The ``sorting`` attribute is refreshed every time. This makes reordering
    // of the palette easy (implementation-wise).
    let newSorting = 1;

    palette.forEach((item) => {
      this._palette.push(
        new ColorizerPaletteItem(
          // ``IColorizerPaletteItem`` defines the ``color`` attribute as type
          // ``ColorizerColor``. However, this comes as a plain JS object from
          // the database, so the visibility of attributes is no concern.
          //
          // @ts-expect-error TS2341 Accessing private attributes
          ColorizerColor.fromXyz(item.color.x, item.color.y, item.color.z),
          newSorting * 5,
          item.paletteItemId
        )
      );
      newSorting++;
    });

    this.notifyPaletteObservers();
  }

  public removePaletteItemById(paletteItemId: string): void {
    // TODO: Here we go!
    console.debug(`removePaletteItemById() ${paletteItemId}`);
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
    this.paletteObservers.forEach((obs) => {
      obs.update(this._palette);
    });
  }
}
