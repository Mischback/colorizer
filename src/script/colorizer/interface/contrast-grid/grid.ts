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
  // @ts-expect-error TS6133 value never read
  private palette: ColorizerPalette;

  public constructor(palette: ColorizerPalette) {
    // Store a reference to the ``ColorizerPalette`` instance. This is an
    // additional reference, used for communicating things back to the palette
    // and **not** part of the *Observer pattern* implementation.
    this.palette = palette;

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
    // empty the existing table to prevent duplicates
    while (this.gridTable.firstChild) {
      this.gridTable.removeChild(this.gridTable.firstChild);
    }

    if (palette.length < 1) {
      return;
    }

    palette.forEach((item) => {
      this.gridTable.appendChild(this.generateGridRow(item, palette));
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

    tableRow.setAttribute("row-item-id", rowItem.paletteItemId);
    tableRow.style.cssText = `--row-color-x: ${itemColor.x}; --row-color-y: ${itemColor.y}; --row-color-z: ${itemColor.z};`;

    palette.forEach((item) => {
      tableRow.appendChild(this.generateGridColumn(item));
    });

    return tableRow;
  }

  private generateGridColumn(
    columnItem: ColorizerPaletteItem
  ): HTMLTableColElement {
    const template = <HTMLTemplateElement>(
      document.getElementById("tpl-grid-column")
    );

    const tableColumn = (
      template.content.firstElementChild as HTMLTableColElement
    ).cloneNode(true) as HTMLTableColElement;

    const itemColor = columnItem.color.toJSON();

    tableColumn.setAttribute("column-item-id", columnItem.paletteItemId);
    tableColumn.style.cssText = `--col-color-x: ${itemColor.x}; --col-color-y: ${itemColor.y}; --col-color-z: ${itemColor.z};`;

    return tableColumn;
  }
}
