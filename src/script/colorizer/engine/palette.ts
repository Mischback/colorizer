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
  public sorting: string;

  public constructor(
    color: ColorizerColor,
    sorting: string,
    paletteItemId?: string
  ) {
    this._color = color;
    this.sorting = sorting;

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
   * Return a *flat* JSON representation of the object.
   *
   * While this class handles its attributes internally and provides the
   * required ``getters()`` for ``color``, ``paletteItemId`` and ``sorting``,
   * this does not work with IndexedDB's requirements, where the object to be
   * stored **must have** its attributes plainly accessible.
   *
   * Note: ``this.color`` is an instance of ``ColorizerColor``, which does
   * provide a specific ``toJSON()`` method. As of now, this method is **not**
   * called explicitly (in fact does calling that mehtod here break the
   * internal typing), but the ``ColorizerColor`` instance is successfully
   * serialized for storing. The application handles the *deserialization*
   * in ``ColorizerPalette.synchronizePaletteFromDb()``, which is working as
   * expected.
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
    await this.add(color, this.nextSorting);

    // TODO: [#42] Successfully added a color, show success message

    this.notifyPaletteObservers();
  }

  /**
   * Remove a palette item from the palette.
   *
   * @param paletteItemId The ID of the item to be removed.
   *
   * This method is called from the ``ColorizerPaletteIO``, which provides a
   * *remove button* for all items.
   */
  public async removePaletteItemById(paletteItemId: string): Promise<void> {
    // console.debug(`removePaletteItemById() ${paletteItemId}`);

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

    // TODO: [#42] Successfully removed a color, show success message

    this.notifyPaletteObservers();
  }

  /**
   * Move an item in the palette.
   *
   * @param oldItemIndex The old index of the item.
   * @param newItemIndex The new index of the item.
   *
   * The actual drag'n'drop operation is handled by an external library, which
   * is attached in ``ColorizerPaletteIO``. This method is called, when the
   * drag operation is finished to make the operation persistent in the
   * application and especially in the database.
   */
  public async moveItemInPalette(
    oldItemIndex: number | undefined,
    newItemIndex: number | undefined
  ) {
    // TODO: [#42] Something went wrong, notify the user
    if (oldItemIndex === undefined || oldItemIndex >= this._palette.length)
      return;
    if (newItemIndex === undefined || newItemIndex >= this._palette.length)
      return;

    // console.debug(`old: ${oldItemIndex} / new: ${newItemIndex}`);

    // Nothing to do... No notification required (see [#42])
    if (oldItemIndex === newItemIndex) return;

    // Get the item. This is safe at the spot of ``oldItemIndex``!
    const theItem = this._palette[oldItemIndex];

    // Remove the old item
    //
    // This changes the length of the array and might have an effect on
    // ``newItemIndex``:
    //   - if ``oldItemIndex`` < ``newItemIndex``, ``newItemIndex`` is actually
    //     lower by one after the splicing
    //   - if ``oldItemIndex`` > ``newItemIndex``, ``newItemIndex`` did not
    //     change
    this._palette.splice(oldItemIndex, 1);

    // insert at new position
    this._palette.splice(newItemIndex, 0, theItem as ColorizerPaletteItem);

    let left = null;
    let right = null;
    if (newItemIndex > 0) {
      left = LexoRank.from(
        (this._palette[newItemIndex - 1] as ColorizerPaletteItem).sorting
      );
    }
    if (newItemIndex < this._palette.length - 1) {
      right = LexoRank.from(
        (this._palette[newItemIndex + 1] as ColorizerPaletteItem).sorting
      );
    }

    // TODO: [#42] Something went wrong, notify the user
    if (left === null && right === null) return;

    // Only one of the parameters of ``between()`` may be ``null``, and in fact
    // the code does ensure that. TypeScript can not detect this, so the
    // TS2769 error is expected.
    //
    // @ts-expect-error TS2769
    theItem.sorting = LexoRank.between(left, right).toString();

    // The paletteItem must be converted to *flat* JSON for IndexedDB.
    await this.update(theItem as ColorizerPaletteItem);

    this.notifyPaletteObservers();
  }

  /**
   * Add a new color to the palette.
   *
   * @param color The actual color, provided as ``ColorizerColor`` instance.
   * @param sorting The sorting of the new palette item. This is managed
   *                internally in this class, see ``addColorToPalette()`` and
   *                the getter of ``nextSorting``.
   * @param paletteItemId This parameter is optional. If it is not provided,
   *                      ``ColorizerPaletteItem`` takes care of calculating
   *                      a ``paletteItemId``.
   *
   * This is the internal (private) method to add a new color. The public
   * interface of the class provides ``addColorToPalette()``, which relies on
   * this method internally.
   */
  private async add(
    color: ColorizerColor,
    sorting: string,
    paletteItemId?: string
  ): Promise<void> {
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
   * Update an existing palette item in the IndexedDB database.
   *
   * @param paletteItem An actual ``ColorizerPaletteItem`` instance that will
   *                    be updated in the database.
   *
   * This is meant to update an existing item, but internally relies on
   * ``IndexedDB``'s ``put()`` method, so this *may be used* to create new
   * items aswell.
   */
  private async update(paletteItem: ColorizerPaletteItem): Promise<void> {
    await this.db.put("palette", paletteItem.toJSON());
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
    console.error(obs);
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
