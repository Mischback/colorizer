// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

export class DragToOrder {
  private container: HTMLElement;
  private itemQuery: string;

  constructor(container: HTMLElement, draggableItemQuery: string) {
    this.container = container;
    this.itemQuery = draggableItemQuery;

    this.prepareItems();
  }

  private createItem(item: HTMLElement): void {
    console.debug("createItem()");
    console.debug(item);
  }

  private getItems(): NodeListOf<HTMLElement> {
    return this.container.querySelectorAll(this.itemQuery);
  }

  private prepareItems(): void {
    const dragItems = this.getItems();

    dragItems.forEach((item) => {
      this.createItem(item);
    });
  }
}
