// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

/**
 * The required function signature for the callback function of drag operation.
 *
 * @param oldIndex The original index of the dragged element.
 * @param newIndex The new index of the element after the drop event.
 *
 * The function should return ``void`` or a ``void Promise``.
 */
export type TDragToOrderDragResultCallback = (
  oldIndex: number,
  newIndex: number
) => void | Promise<void>;

class ItemNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ItemNotFoundError";
  }
}

/**
 * Provide a generic drag'n'drop functionality, based on HTML5's API.
 *
 * @param container An actual HTML element, the container to work on. Might be
 *                  fetched i.e. using ``getElementById()``.
 * @param draggableItemQuery A query string to identify the actual draggable
 *                           items. Used with ``querySelectorAll()``.
 * @param dragResultCallback The callback function to execute on a successful
 *                           drag'n'drop operation.
 * @param styleCurrentlyDragged The name of a CSS class to attach to the
 *                              currently dragged item / element.
 * @param styleDropTargetHover The name of a CSS class to attach to the
 *                             currently hovered item / element, if it is a
 *                             valid drop target.
 *
 * The class does provide the required setup to make items (child elements of
 * ``container``) draggable. The corresponding event listeners are methods
 * of this class and bound to the instance. They are attached to the
 * ``container``, so they are provided only one time per instance.
 *
 * Internally, the draggable elements are identified by using
 * ``querySelectorAll()`` with ``draggableItemQuery`` as its parameter.
 * Dynamically added elements are noticed using a ``MutationObserver``.
 *
 * ``styleCurrentlyDragged`` and ``styleDropTargetHover`` are applied as CSS
 * classes to the elements. No actual styles are provided!
 *
 * A successful drag'n'drop operation is assumed, when an element is *dropped*
 * on a valid drop target and ``dragResultCallback`` is called.
 */
export class DragToOrder {
  private activeDrag: boolean;
  private container: HTMLElement;
  private containerMutationObserver;
  private draggedItem: HTMLElement | undefined;
  private dragResultCallback: TDragToOrderDragResultCallback;
  private dropZone: HTMLElement | undefined;
  private instanceId;
  private itemQuery: string;
  private newIndex: number;
  private oldIndex: number;
  private styleCurrentlyDragged: string;
  private styleDropTargetHover: string;

  constructor(
    container: HTMLElement,
    draggableItemQuery: string,
    dragResultCallback: TDragToOrderDragResultCallback,
    styleCurrentlyDragged = "dragtoorder-currently-dragged",
    styleDropTargetHover = "dragtoorder-drop-target-hover"
  ) {
    this.container = container;
    this.itemQuery = draggableItemQuery;
    this.dragResultCallback = dragResultCallback;
    this.styleCurrentlyDragged = styleCurrentlyDragged;
    this.styleDropTargetHover = styleDropTargetHover;

    this.draggedItem = undefined;
    this.oldIndex = -1;
    this.dropZone = undefined;
    this.newIndex = -1;
    this.activeDrag = false;

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
    this.prepareItems();
  }

  /**
   * Determine the index of an item in this instance's list of items.
   *
   * This is the method which does the actual *search* / *determination* of
   * the index, if possible. See the related ``getItemIndex()`` method, which
   * wraps around this function for an easy to use interface. Code should
   * preferable use ``getItemIndex()``!
   */
  private searchItemIndex(item: HTMLElement): number {
    if (item === this.container) {
      throw new ItemNotFoundError("Item not found in container");
    }

    const itemIndex = Array.prototype.indexOf.call(this.getItems(), item);

    if (itemIndex === -1) {
      return this.searchItemIndex(<HTMLElement>item.parentNode);
    }

    return itemIndex;
  }

  /**
   * Return the index of the item in the instance's list of items or ``false``.
   *
   * This method wraps around ``searchItemIndex()`` to provide a nicer
   * interface.
   */
  private getItemIndex(item: HTMLElement): number | false {
    console.log(`getItemIndex() of ${this.instanceId}`);
    let tmpIndex = -1;
    try {
      tmpIndex = this.searchItemIndex(item);
    } catch (err) {
      // @ts-expect-error TS18046 ``err`` is of type unknown
      if (err.name === "ItemNotFoundError") {
        return false;
      } else {
        throw err;
      }
    }

    if (tmpIndex !== -1) {
      return tmpIndex;
    } else {
      return false;
    }
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
    const tmpIndex = this.getItemIndex(<HTMLElement>evt.target);
    if (tmpIndex === false) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    // console.debug(`handlerDragStart() of ${this.instanceId}`);
    // console.debug(evt);

    // @ts-expect-error TS18047 Might be ``null``... Nope!
    evt.dataTransfer.effectAllowed = "move";

    (evt.target as HTMLElement).classList.add(this.styleCurrentlyDragged);

    this.draggedItem = <HTMLElement>evt.target;
    this.oldIndex = tmpIndex;
    this.activeDrag = true;
  }

  private handlerDragEnd(evt: DragEvent): void {
    // If multiple instances are attached to the same ``container``, this
    // reduces the execution of (expensive) event handlers.
    if (!this.activeDrag) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    // console.debug(`handlerDragEnd() of ${this.instanceId}`);
    // console.debug(evt);

    this.activeDrag = false;

    (evt.target as HTMLElement).classList.remove(this.styleCurrentlyDragged);
  }

  private handlerDragOver(evt: DragEvent): void {
    // If multiple instances are attached to the same ``container``, this
    // reduces the execution of (expensive) event handlers.
    if (!this.activeDrag) {
      return;
    }

    const tmpIndex = this.getItemIndex(<HTMLElement>evt.target);
    if (tmpIndex === false) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    // console.debug(`handlerDragOver() of ${this.instanceId}`);
    // console.debug(evt);

    if (this.dropZone !== evt.target) {
      this.newIndex = tmpIndex;
      this.dropZone = <HTMLElement>evt.target;
    }

    if (
      this.newIndex !== -1 &&
      this.oldIndex !== -1 &&
      this.newIndex !== this.oldIndex
    ) {
      evt.preventDefault();
    }
  }

  private handlerDragDrop(evt: DragEvent): void {
    // If multiple instances are attached to the same ``container``, this
    // reduces the execution of (expensive) event handlers.
    if (!this.activeDrag) {
      return;
    }

    if (this.getItemIndex(<HTMLElement>evt.target) === false) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    // console.debug(`handlerDragDrop() of ${this.instanceId}`);
    // console.debug(evt);

    this.draggedItem?.classList.remove(this.styleCurrentlyDragged);
    this.dropZone?.classList.remove(this.styleDropTargetHover);

    console.info(`oldIndex: ${this.oldIndex}, newIndex: ${this.newIndex}`);
    void this.dragResultCallback(this.oldIndex, this.newIndex);

    this.draggedItem = undefined;
    this.oldIndex = -1;
    this.dropZone = undefined;
    this.newIndex = -1;
    this.activeDrag = false;
  }

  private handlerDragEnter(evt: DragEvent): void {
    // If multiple instances are attached to the same ``container``, this
    // reduces the execution of (expensive) event handlers.
    if (!this.activeDrag) {
      return;
    }

    if (this.getItemIndex(<HTMLElement>evt.target) === false) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    // console.debug(`handlerDragEnter() of ${this.instanceId}`);
    // console.debug(evt);

    (evt.target as HTMLElement).classList.add(this.styleDropTargetHover);
  }

  private handlerDragLeave(evt: DragEvent): void {
    // If multiple instances are attached to the same ``container``, this
    // reduces the execution of (expensive) event handlers.
    if (!this.activeDrag) {
      return;
    }

    if (this.getItemIndex(<HTMLElement>evt.target) === false) {
      return;
    }

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    // console.debug(`handlerDragLeave() of ${this.instanceId}`);
    // console.debug(evt);

    this.dropZone?.classList.remove(this.styleDropTargetHover);
  }

  /**
   * Iterate a list of items that are meant to be *draggable*.
   */
  private prepareItems(): void {
    // console.debug("prepareItems()");
    const itemList = this.getItems();

    itemList.forEach((item) => {
      // Make the item draggable without any further checks. If the attribute
      // is already set, it is simply set again. This should not have side
      // effects.
      item.setAttribute("draggable", "true");
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

      // NOTE: the ``mutation.addedNodes`` does already provide a list of
      //       mutated objects / elements. However, the mutation process might
      //       lead to significant false positives (e.g. the instance's query
      //       targets ``<th>`` elements, but the mutation list contains
      //       ``<tr>`` elements, because the table is created row by row.
      //
      //       Calling the (internal) ``prepareItems()`` will use ``getItems()``
      //       to ensure, that the setup is performed for the actual desired
      //       elements.
      //
      //       After verification, ``prepareItems()`` was modified to not
      //       accept a list of items anymore!
      // this.prepareItems(<NodeListOf<HTMLElement>>mutation.addedNodes);
      this.prepareItems();
    }
  }
}
