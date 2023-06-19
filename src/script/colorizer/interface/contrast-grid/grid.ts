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

    // Get the templates.
    //
    // The actual ``#tpl-grid-table`` is a full HTML table, but only specific
    // siblings are actually needed for templating.
    //
    // However, the full template is cloned in order to get access to the
    // specific siblings, which are then passed on to ``generateGridRow()`` and
    // consequently to ``generateGridColumn()``.
    const template = (
      (getDomElement(null, "#tpl-grid-table") as HTMLTemplateElement).content
        .firstElementChild as HTMLTableElement
    ).cloneNode(true) as HTMLTableElement;

    const headRow = getDomElement(template, ".head-row");
    const headRowCol = getDomElement(headRow, "th");
    headRow.removeChild(headRowCol);
    const gridRowTemplate = <HTMLTableRowElement>(
      getDomElement(template, ".grid-row")
    );
    const gridColTemplate = <HTMLTableColElement>(
      getDomElement(gridRowTemplate, ".grid-col")
    );
    gridRowTemplate.removeChild(gridColTemplate);

    // First of all, append a *head row* to the <table>.
    // This does only include two cells.
    this.gridTable.appendChild(headRow);

    let headCol;
    palette.forEach((rowItem) => {
      // FIXME: headRowCol needs customization
      headCol = <HTMLTableCellElement>headRowCol.cloneNode(true);
      headCol.innerHTML = rowItem.paletteItemId;
      headRow.appendChild(headCol);

      this.gridTable.appendChild(
        this.generateGridRow(rowItem, palette, gridRowTemplate, gridColTemplate)
      );
    });
  }

  private generateGridRow(
    rowItem: ColorizerPaletteItem,
    palette: ColorizerPaletteItem[],
    rowTemplate: HTMLTableRowElement,
    colTemplate: HTMLTableColElement
  ): HTMLTableRowElement {
    const tableRow = <HTMLTableRowElement>rowTemplate.cloneNode(true);

    const itemColor = rowItem.color.toJSON();

    tableRow.setAttribute("row-item-id", rowItem.paletteItemId);
    tableRow.style.cssText = `--row-color-x: ${itemColor.x}; --row-color-y: ${itemColor.y}; --row-color-z: ${itemColor.z};`;

    const head = <HTMLTableCellElement>getDomElement(tableRow, ".head-col");
    head.innerHTML = rowItem.paletteItemId;

    palette.forEach((colItem) => {
      tableRow.appendChild(
        this.generateGridColumn(rowItem, colItem, colTemplate)
      );
    });

    return tableRow;
  }

  private generateGridColumn(
    rowItem: ColorizerPaletteItem,
    columnItem: ColorizerPaletteItem,
    colTemplate: HTMLTableColElement
  ): HTMLTableColElement {
    const tableCol = <HTMLTableColElement>colTemplate.cloneNode(true);

    const colColor = columnItem.color.toJSON();
    const rowColor = rowItem.color.toJSON();
    const contrastValue = getContrastValue(colColor.y, rowColor.y);

    tableCol.setAttribute("column-item-id", columnItem.paletteItemId);
    tableCol.style.cssText = `--col-color-x: ${colColor.x}; --col-color-y: ${colColor.y}; --col-color-z: ${colColor.z};`;

    const cat = <HTMLParagraphElement>getDomElement(tableCol, ".wcag-cat");
    cat.innerHTML = getWcagCat(contrastValue);

    const contrast = <HTMLParagraphElement>(
      getDomElement(tableCol, ".wcag-contrast")
    );
    contrast.innerHTML = roundToPrecision(contrastValue, 2).toString();

    return tableCol;
  }
}
