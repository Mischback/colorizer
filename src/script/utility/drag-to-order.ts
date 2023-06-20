// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

export class DragToOrder {
  private container: HTMLElement;
  private itemQuery: string;
  private containerMutationObserver;

  constructor(container: HTMLElement, draggableItemQuery: string) {
    this.container = container;
    this.itemQuery = draggableItemQuery;

    // Observe mutations of the container, in particular the addition of new
    // child elements.
    this.containerMutationObserver = new MutationObserver(
      this.containerMutationCallback.bind(this)
    );
    this.containerMutationObserver.observe(this.container, { childList: true });

    // Initial setup of the *draggable items*.
    this.prepareItems(this.getItems());
  }

  private createItem(item: HTMLElement): void {
    console.debug("createItem()");
    console.debug(item);
  }

  /**
   * Get a list of *draggable items*.
   *
   * This method uses ``querySelectorAll()`` with ``this.itemQuery`` to get
   * the list of items that are meant to be draggable.
   */
  private getItems(): NodeListOf<HTMLElement> {
    return this.container.querySelectorAll(this.itemQuery);
  }

  /**
   * Iterate a list of items that are meant to be *draggable*.
   *
   * @param itemList The list of items to process.
   *
   * Basically this makes sure to call ``createItem()`` an all items.
   */
  private prepareItems(itemList: NodeListOf<HTMLElement>): void {
    console.debug("prepareItems()");

    itemList.forEach((item) => {
      this.createItem(item);
    });
  }

  /**
   * Prepare dynamically added *draggable items* for dragging operations.
   *
   * The *draggable items* might be added dynamically to the container, so
   * the required attributes and event handlers must be added dynamically, too.
   *
   * Reference:
   * - https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
   * - https://developer.mozilla.org/en-US/docs/Web/API/MutationRecord
   */
  private containerMutationCallback(
    mutationList: MutationRecord[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _: MutationObserver
  ): void {
    for (const mutation of mutationList) {
      if (mutation.type !== "childList") {
        console.warn("Unexpected mutation type");
        continue;
      }

      this.prepareItems(<NodeListOf<HTMLElement>>mutation.addedNodes);
    }
  }
}
