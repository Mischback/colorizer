// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { getContrastValue, getWcagCat } from "./calculus";
import { getDomElement, roundToPrecision } from "../../../utility";
import type { ColorizerPaletteItem } from "../../engine/palette";
import type { IColorizerPaletteObserver } from "../../lib/types";

export class ColorizerContrastGrid implements IColorizerPaletteObserver {
  private gridTable: HTMLTableElement;

  public constructor() {
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
      tableRow.appendChild(this.generateGridColumn(rowItem, item));
    });

    return tableRow;
  }

  private generateGridColumn(
    rowItem: ColorizerPaletteItem,
    columnItem: ColorizerPaletteItem
  ): HTMLTableColElement {
    const template = <HTMLTemplateElement>(
      getDomElement(null, "#tpl-grid-column")
    );

    const tableColumn = (
      template.content.firstElementChild as HTMLTableColElement
    ).cloneNode(true) as HTMLTableColElement;

    const colColor = columnItem.color.toJSON();
    const rowColor = rowItem.color.toJSON();
    const contrastValue = getContrastValue(colColor.y, rowColor.y);

    tableColumn.setAttribute("column-item-id", columnItem.paletteItemId);
    tableColumn.style.cssText = `--col-color-x: ${colColor.x}; --col-color-y: ${colColor.y}; --col-color-z: ${colColor.z};`;

    const cat = <HTMLParagraphElement>getDomElement(tableColumn, ".wcag-cat");
    cat.innerHTML = getWcagCat(contrastValue);

    const contrast = <HTMLParagraphElement>(
      getDomElement(tableColumn, ".wcag-contrast")
    );
    contrast.innerHTML = roundToPrecision(contrastValue, 2).toString();

    return tableColumn;
  }
}
