// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getDomElement, DragToOrder, roundToPrecision } from "../../utility";
import type {
  ColorizerPaletteItem,
  TRemoveItemCallback,
} from "../engine/palette";
import type { IColorizerPaletteObserver } from "../lib/types";
import type { TDragToOrderDragResultCallback } from "../../utility";

export class ColorizerPaletteIO implements IColorizerPaletteObserver {
  private paletteList: HTMLUListElement;
  private removeItemCallback: TRemoveItemCallback;
  // @ts-expect-error TS6133 value never read
  private dragToOrder: DragToOrder;

  public constructor(
    moveItemCallback: TDragToOrderDragResultCallback,
    removeItemCallback: TRemoveItemCallback
  ) {
    this.removeItemCallback = removeItemCallback;

    // Get the required DOM elements
    this.paletteList = <HTMLUListElement>(
      getDomElement(null, "#color-palette .item-list")
    );

    this.dragToOrder = new DragToOrder(
      this.paletteList,
      ".palette-item",
      moveItemCallback
    );
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

    void this.removeItemCallback(paletteItemId);
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
      getDomElement(null, "#tpl-palette-item")
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

    const notations = <HTMLUListElement>(
      getDomElement(paletteItem, ".notations")
    );

    const notationXyz = document.createElement("li");
    notationXyz.innerHTML = `<strong>XYZ</strong> x: ${roundToPrecision(
      paletteItemColor.x,
      3
    )}, y: ${roundToPrecision(paletteItemColor.y, 3)}, z: ${roundToPrecision(
      paletteItemColor.z,
      3
    )}`;
    notations.appendChild(notationXyz);

    const itemRgb = item.color.toRgb255();
    const notationRgb = document.createElement("li");
    notationRgb.innerHTML = `<strong>RGB</strong> r: ${itemRgb.r}, g: ${itemRgb.g}, b: ${itemRgb.b}`;
    notations.appendChild(notationRgb);

    const itemRgbHex = item.color.toRgbHex();
    const notationRgbHex = document.createElement("li");
    notationRgbHex.innerHTML = itemRgbHex;
    notations.appendChild(notationRgbHex);

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
