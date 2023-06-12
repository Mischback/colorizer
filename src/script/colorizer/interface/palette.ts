// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getDomElement } from "../../utility";
import type { ColorizerPaletteItem } from "../engine/palette";
import type { IColorizerPaletteObserver } from "../lib/types";

export class ColorizerPaletteInterface implements IColorizerPaletteObserver {
  private paletteContainer: HTMLElement;
  private paletteList: HTMLUListElement;

  public constructor() {
    console.debug("Initializing ColorizerPaletteInterface");

    this.paletteContainer = <HTMLElement>getDomElement(null, "#color-palette");
    this.paletteList = <HTMLUListElement>(
      getDomElement(this.paletteContainer, "ul")
    );
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
}
