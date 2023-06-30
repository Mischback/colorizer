// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getDomElement, DragToOrder } from "../../utility";
import type {
  ColorizerPaletteItem,
  TRemoveItemCallback,
} from "../engine/palette";
import type { ColorizerColor } from "../lib/color";
import type {
  IColorizerPaletteObserver,
  TColorizerColorNotation,
} from "../lib/types";
import type { TDragToOrderDragResultCallback } from "../../utility";

export type TColorizerPaletteItemNotation = TColorizerColorNotation;

export class ColorizerPaletteIO implements IColorizerPaletteObserver {
  private paletteList: HTMLUListElement;
  private removeItemCallback: TRemoveItemCallback;
  private notations: TColorizerPaletteItemNotation[];
  // @ts-expect-error TS6133 value never read
  private dragToOrder: DragToOrder;

  public constructor(
    moveItemCallback: TDragToOrderDragResultCallback,
    removeItemCallback: TRemoveItemCallback,
    notations: TColorizerPaletteItemNotation[]
  ) {
    this.removeItemCallback = removeItemCallback;
    this.notations = notations;

    // Get the required DOM elements
    this.paletteList = <HTMLUListElement>(
      getDomElement(null, "#color-palette-list")
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

    // Find the nearest ``palette-item-id``
    //
    // As the markup of palette items may be modified in ``src/index.html``,
    // this is a more generic approach. The only assumption is, that the
    // button is the child of the overall palette item. Should be reasonable
    // enough.
    let paletteItemId: string | null | undefined = null;
    let elem: HTMLElement | null = <HTMLElement>evt.target;
    while (elem != null && paletteItemId === null) {
      elem = elem.parentNode as HTMLElement;
      paletteItemId = elem?.getAttribute("palette-item-id");
    }

    if (paletteItemId === null || paletteItemId === undefined) {
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

    // Notations
    const notationList = <HTMLUListElement>(
      getDomElement(paletteItem, ".notations")
    );
    this.notations.forEach((notation) => {
      notationList.appendChild(
        this.generateColorNotation(item.color, notation)
      );
    });

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

  private generateColorNotation(
    color: ColorizerColor,
    notation: TColorizerPaletteItemNotation
  ): HTMLLIElement {
    const template = <HTMLTemplateElement>(
      getDomElement(null, "#tpl-palette-item-notation")
    );

    const li = (template.content.firstElementChild as HTMLLIElement).cloneNode(
      true
    ) as HTMLLIElement;

    const caption = <HTMLSpanElement>getDomElement(li, ".caption");
    const value = <HTMLSpanElement>getDomElement(li, ".value");

    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access */
    let tmp: any;
    switch (notation) {
      case "xyz":
        tmp = color.toJSON();
        li.classList.add("xyz");
        li.style.cssText += `--color-component-a: ${tmp.x}; --color-component-b: ${tmp.y}; --color-component-c: ${tmp.z}`;
        tmp = color.toXyzString();
        caption.innerHTML = "XYZ";
        value.innerHTML = `(${tmp.x}, ${tmp.y}, ${tmp.z})`;
        break;
      case "rgb":
        tmp = color.toRgb255();
        li.classList.add("rgb");
        li.style.cssText += `--color-component-a: ${tmp.r}; --color-component-b: ${tmp.g}; --color-component-c: ${tmp.b}`;
        caption.innerHTML = "RGB";
        value.innerHTML = `(${tmp.r}, ${tmp.g}, ${tmp.b})`;
        break;
      case "hwb":
        tmp = color.toHwb();
        li.classList.add("hwb");
        li.style.cssText += `--color-component-a: ${tmp.h}; --color-component-b: ${tmp.w}; --color-component-c: ${tmp.b}`;
        tmp = color.toHwbString();
        caption.innerHTML = "RGB (HWB)";
        value.innerHTML = `(${tmp.h}, ${tmp.w}%, ${tmp.b}%)`;
        break;
      case "hsl":
        tmp = color.toHsl();
        li.classList.add("hsl");
        li.style.cssText += `--color-component-a: ${tmp.h}; --color-component-b: ${tmp.s}; --color-component-c: ${tmp.l}`;
        tmp = color.toHslString();
        caption.innerHTML = "RGB (HSL)";
        value.innerHTML = `(${tmp.h}, ${tmp.s}%, ${tmp.l}%)`;
        break;
      case "oklch":
        tmp = color.toOklch();
        li.classList.add("oklch");
        li.style.cssText += `--color-component-a: ${tmp.l}; --color-component-b: ${tmp.c}; --color-component-c: ${tmp.h}`;
        tmp = color.toOklchString();
        caption.innerHTML = "OkLCH";
        value.innerHTML = `(${tmp.l}%, ${tmp.c}%, ${tmp.h})`;
        break;
      default:
        break;
    }

    return li;
  }
}
