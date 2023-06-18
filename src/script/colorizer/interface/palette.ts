// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getDomElement } from "../../utility";
import Sortable from "sortablejs";
import type { ColorizerPalette, ColorizerPaletteItem } from "../engine/palette";
import type { IColorizerPaletteObserver } from "../lib/types";

export class ColorizerPaletteIO implements IColorizerPaletteObserver {
  private palette: ColorizerPalette;
  private paletteList: HTMLUListElement;
  // @ts-expect-error TS6133 value never read
  private sortable: Sortable;

  public constructor(palette: ColorizerPalette) {
    // Store a reference to the ``ColorizerPalette`` instance. This is an
    // additional reference, used for communicating things back to the palette
    // and **not** part of the *Observer pattern* implementation.
    this.palette = palette;

    // Get the required DOM elements
    this.paletteList = <HTMLUListElement>(
      getDomElement(null, "#color-palette ul")
    );

    this.sortable = Sortable.create(this.paletteList, {
      draggable: ".sortable-item",
      onEnd: (evt) => {
        void this.palette.moveItemInPalette(evt.oldIndex, evt.newIndex);
      },
    });
  }

  /**
   * Perform actions on palette updates.
   *
   * @param palette The updated/changed palette.
   *
   * This is part of the implementation of the Observer pattern. This class
   * acts as an *Observer* to the ``ColorizerPalette`` *Observable*.
   */
  public update(palette: ColorizerPaletteItem[]): void {
    // empty the existing palette to prevent duplicates
    while (this.paletteList.firstChild) {
      this.paletteList.removeChild(this.paletteList.firstChild);
    }

    if (palette.length < 1) {
      return;
    }

    for (let i = 0; i < palette.length; i++) {
      this.paletteList.appendChild(
        this.generatePaletteItem(<ColorizerPaletteItem>palette[i])
      );
    }
  }

  /**
   * Handle clicks on the *remove* button.
   *
   * @param evt The DOM's ``click`` event.
   *
   * The method determines the ``palette-item-id`` of the parent *list item*
   * (see ``generatePaletteItem()``) and calls ``removePaletteItemByID()`` of
   * the actual ``ColorizerPalette`` instance.
   */
  private removeButtonEventHandler(evt: Event): void {
    evt.preventDefault();
    evt.stopPropagation();

    const paletteItemId = (
      (evt.target as HTMLElement).parentNode as HTMLElement
    ).getAttribute("palette-item-id");
    if (paletteItemId === null) {
      throw new Error("Could not determine ID of PaletteItem");
    }

    void this.palette.removePaletteItemById(paletteItemId);
  }

  /**
   * Create a DOM element representing one palette item.
   *
   * @param item An instance of ``ColorizerPaletteItem``.
   * @returns A representation of a *palette item*, provided as
   *          ``HTMLLIElement``.
   *
   * This uses the *template* ``tpl-palette-item`` internally, see
   * ``index.html``. It sets the (logically) required attributes, adds event
   * handlers and prepares the DOM representation of a *palette item*. It is
   * appended to the existing DOM structure in ``update()``.
   *
   * References:
   * - https://developer.mozilla.org/en-US/docs/Web/API/Web_components
   * - https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template
   * - https://css-tricks.com/an-introduction-to-web-components/
   */
  private generatePaletteItem(item: ColorizerPaletteItem): HTMLLIElement {
    const template = <HTMLTemplateElement>(
      document.getElementById("tpl-palette-item")
    );

    const paletteItem = (
      template.content.firstElementChild as HTMLLIElement
    ).cloneNode(true) as HTMLLIElement;

    const paletteItemColor = item.color.toJSON();

    paletteItem.setAttribute("palette-item-id", item.paletteItemId);
    paletteItem.style.cssText = `--palette-item-color-x: ${paletteItemColor.x}; --palette-item-color-y: ${paletteItemColor.y}; --palette-item-color-z: ${paletteItemColor.z};`;

    // TODO: [#41] Semantic names for PaletteItems
    //       Should a color's *label* be adjustable by the user? This would
    //       allow the user to provide a *semantic name* for the color.
    const label = <HTMLDivElement>getDomElement(paletteItem, ".label");
    label.innerHTML = `${item.paletteItemId}`;

    // Attach Event Listeners
    const removeButton = <HTMLButtonElement>(
      getDomElement(paletteItem, ".button-remove")
    );
    removeButton.addEventListener(
      "click",
      this.removeButtonEventHandler.bind(this)
    );

    return paletteItem;
  }
}
