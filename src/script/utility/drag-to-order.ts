// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

class ItemNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ItemNotFoundError";
  }
}

export class DragToOrder {
  private container: HTMLElement;
  private containerMutationObserver;
  // @ts-expect-error TS6133 value never read
  private draggedItem: HTMLElement | undefined;
  private dropZone: HTMLElement | undefined;
  private instanceId;
  private itemQuery: string;
  private newIndex: number;
  private oldIndex: number;

  constructor(container: HTMLElement, draggableItemQuery: string) {
    this.container = container;
    this.itemQuery = draggableItemQuery;

    this.draggedItem = undefined;
    this.oldIndex = -1;
    this.dropZone = undefined;
    this.newIndex = -1;

    // FIXME: Just for debugging/development
    this.instanceId = crypto.randomUUID();

    this.container.addEventListener(
      "dragstart",
      this.handlerDragStart.bind(this)
    );
    this.container.addEventListener("dragend", this.handlerDragEnd.bind(this));
    this.container.addEventListener(
      "dragover",
      this.handlerDragOver.bind(this)
    );
    this.container.addEventListener("drop", this.handlerDragDrop.bind(this));
    this.container.addEventListener(
      "dragenter",
      this.handlerDragEnter.bind(this)
    );
    this.container.addEventListener(
      "dragleave",
      this.handlerDragLeave.bind(this)
    );

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

    if (item.getAttribute("draggable") === "true") {
      console.debug("Item is already draggable");
      return;
    }

    console.debug("Item must be processed");
    item.setAttribute("draggable", "true");
  }

  private getItemIndex(item: HTMLElement): number {
    if (item === this.container) {
      throw new ItemNotFoundError("Item not found in container");
    }

    const itemIndex = Array.prototype.indexOf.call(this.getItems(), item);

    if (itemIndex === -1) {
      return this.getItemIndex(<HTMLElement>item.parentNode);
    }

    return itemIndex;
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

  private handlerDragStart(evt: DragEvent): void {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.debug(`handlerDragStart() of ${this.instanceId}`);
    // console.debug(evt);

    if (this.container.contains(evt.target as Node) === false) {
      return;
    }

    // @ts-expect-error TS18047 Might be ``null``... Nope!
    evt.dataTransfer.effectAllowed = "move";

    // FIXME: Make the class name configurable!
    // evt.target.classList.add("currently-dragged");

    this.draggedItem = <HTMLElement>evt.target;
    this.oldIndex = this.getItemIndex(<HTMLElement>evt.target);
  }

  // @ts-expect-error TS6133 value never read
  private handlerDragEnd(evt: DragEvent): void {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.debug(`handlerDragEnd() of ${this.instanceId}`);
    // console.debug(evt);

    // FIXME: Make the class name configurable!
    // evt.target.classList.remove("currently-dragged");
  }

  private handlerDragOver(evt: DragEvent): void {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.debug(`handlerDragOver() of ${this.instanceId}`);
    // console.debug(evt);

    if (this.dropZone !== evt.target) {
      this.newIndex = this.getItemIndex(<HTMLElement>evt.target);
      this.dropZone = <HTMLElement>evt.target;
    }

    if (this.newIndex !== -1 && this.newIndex !== this.oldIndex) {
      evt.preventDefault();
    }
  }

  // @ts-expect-error TS6133 value never read
  private handlerDragDrop(evt: DragEvent): void {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.debug(`handlerDragDrop() of ${this.instanceId}`);
    // console.debug(evt);

    // FIXME: Make the class name configurable!
    // this.dropZone.classList.remove("drop-target-hover");

    console.info(`oldIndex: ${this.oldIndex}, newIndex: ${this.newIndex}`);

    this.draggedItem = undefined;
    this.oldIndex = -1;
    this.dropZone = undefined;
    this.newIndex = -1;
  }

  // @ts-expect-error TS6133 value never read
  private handlerDragEnter(evt: DragEvent): void {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.debug(`handlerDragEnter() of ${this.instanceId}`);
    // console.debug(evt);

    // FIXME: Make the class name configurable!
    // evt.target.classList.add("drop-target-hover");
  }

  // @ts-expect-error TS6133 value never read
  private handlerDragLeave(evt: DragEvent): void {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.debug(`handlerDragLeave() of ${this.instanceId}`);
    // console.debug(evt);

    // FIXME: Make the class name configurable!
    // this.dropZone.classList.remove("drop-target-hover");
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