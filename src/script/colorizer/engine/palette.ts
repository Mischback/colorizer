// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerColor } from "../lib/color";
import { mHash } from "../../utility";
import LexoRank from "@kayron013/lexorank";
import type { ColorizerDatabase } from "./database";
import type {
  IColorizerPaletteObservable,
  IColorizerPaletteObserver,
} from "../lib/types";

export interface IColorizerPaletteItem {
  paletteItemId: string;
  color: ColorizerColor;
  sorting: string;
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
  private _sorting: string;

  public constructor(
    color: ColorizerColor,
    sorting: string,
    paletteItemId?: string
  ) {
    this._color = color;
    this._sorting = sorting;

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
  public get sorting(): string {
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
  private _nextSorting;

  public constructor(
    dbInstance: ColorizerDatabase,
    sortingInitializer = "foobar"
  ) {
    console.debug("Initializing ColorizerPalette");

    // Store a reference to the database wrapper
    this.db = dbInstance;

    // Initialize the lexicographical sorting
    this._nextSorting = new LexoRank(sortingInitializer);

    // Properly initialize the internal palette from the database.
    void this.synchronizePaletteFromDb();
  }

  private get nextSorting(): string {
    this._nextSorting = this._nextSorting.increment();

    return this._nextSorting.toString();
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

    await this.add(color, this.nextSorting);

    this.notifyPaletteObservers();
  }

  /**
   * Remove a palette item from the palette.
   *
   * @param paletteItemId The ID of the item to be removed.
   *
   * This method is called from the ``ColorizerPaletteInterface``, which
   * provides a *remove button* for all items.
   */
  public async removePaletteItemById(paletteItemId: string): Promise<void> {
    console.debug(`removePaletteItemById() ${paletteItemId}`);

    // Remove item from the IndexedDB database
    await this.db.deleteById("palette", paletteItemId);

    // Remove the item from the internal ``_palette``
    const item = this._palette.find(
      (needle) => needle.paletteItemId === paletteItemId
    );
    if (item === undefined) return;
    const itemIndex = this._palette.indexOf(item);
    if (itemIndex === -1) return;
    this._palette.splice(itemIndex, 1);

    this.notifyPaletteObservers();
  }

  public moveItemInPalette(
    oldItemIndex: number | undefined,
    newItemIndex: number | undefined
  ) {
    // FIXME: This is **unfinished**, but a better solution requires changes
    //        to the implementation of ColorizerPaletteItem first.
    console.debug("moveItemInPalette()");

    if (oldItemIndex === undefined || oldItemIndex >= this._palette.length)
      return;
    if (newItemIndex === undefined || newItemIndex >= this._palette.length)
      return;

    // @ts-expect-error TS2532
    console.debug(`Old sorting: ${this._palette[oldItemIndex].sorting}`);
    // @ts-expect-error TS2532
    console.debug(`New sorting: ${this._palette[newItemIndex].sorting}`);
  }

  private async add(
    color: ColorizerColor,
    sorting: string,
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

    palette.forEach((item) => {
      this._palette.push(
        new ColorizerPaletteItem(
          // ``IColorizerPaletteItem`` defines the ``color`` attribute as type
          // ``ColorizerColor``. However, this comes as a plain JS object from
          // the database, so the visibility of attributes is no concern.
          //
          // @ts-expect-error TS2341 Accessing private attributes
          ColorizerColor.fromXyz(item.color.x, item.color.y, item.color.z),
          item.sorting,
          item.paletteItemId
        )
      );
    });

    // Set the internal ``_nextSorting`` to the maximum ``sorting`` value from
    // the IndexedDB dataset.
    //
    // The items were retrieved ordered by their ``sorting`` attribute, so the
    // last item in ``_palette`` has the *highest* value of ``sorting``.
    if (this._palette.length >= 1) {
      this._nextSorting = LexoRank.from(
        (this._palette[this._palette.length - 1] as ColorizerPaletteItem)
          .sorting
      );
    }

    this.notifyPaletteObservers();
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
