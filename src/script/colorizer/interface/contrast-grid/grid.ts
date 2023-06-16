// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getDomElement } from "../../../utility";
import type {
  ColorizerPalette,
  ColorizerPaletteItem,
} from "../../engine/palette";
import type { IColorizerPaletteObserver } from "../../lib/types";

export class ColorizerContrastGrid implements IColorizerPaletteObserver {
  private gridTable: HTMLTableElement;
  private palette: ColorizerPalette;

  public constructor(palette: ColorizerPalette) {
    // Store a reference to the ``ColorizerPalette`` instance and register
    // this instance as an *Observer*.
    this.palette = palette;
    this.palette.addPaletteObserver(this);

    // Get the required DOM elements
    this.gridTable = <HTMLTableElement>(
      getDomElement(null, "#contrast-grid table")
    );

    console.debug(this.gridTable);
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
    palette.forEach((item) => {
      console.log(item);

      this.gridTable.appendChild(
        this.generateGridRow(item, palette)
      );
    });
  }

  private generateGridRow(
    rowItem: ColorizerPaletteItem,
    palette: ColorizerPaletteItem[]
  ): HTMLTableRowElement {
    const template = <HTMLTemplateElement>(
      document.getElementById("tpl-grid-row")
    );

    const tableRow = (
      template.content.firstElementChild as HTMLTableRowElement
    ).cloneNode(true) as HTMLTableRowElement;

    const itemColor = rowItem.color.toJSON();

    tableRow.setAttribute("palette-item-id", rowItem.paletteItemId);
    tableRow.style.cssText = `--row-color-x: ${itemColor.x}; --row-color-y: ${itemColor.y}; --row-color-z: ${itemColor.z};`;

    return tableRow;
  }
}
