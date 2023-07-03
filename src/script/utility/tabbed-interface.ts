// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

/**
 * Generic code to provide an interface based on tabs.
 *
 * The *tabbed interface* consists of **tabs**, which are the actual clickable
 * elements, and corrensponding **panels**, the containers of the actual
 * content. Clicking (or *interacting* with the) tab makes the associated
 * panel visible and hides all other panels.
 *
 * This is only the script part of this element, styling (including hiding and
 * revealing panels) **must be done** in a corresponding stylesheet.
 *
 * References:
 * - https://dev.to/link2twenty/accessibility-first-tabs-ken
 * - https://blog.logrocket.com/build-accessible-user-interface-tabs-javascript/
 * - https://www.w3.org/WAI/ARIA/apg/patterns/tabs/examples/tabs-automatic/
 * - https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles
 * - https://www.smashingmagazine.com/2021/03/complete-guide-accessible-front-end-components/
 */
export class TabbedInterface {
  private tabContainer: HTMLElement;
  private tabs: HTMLElement[];
  private panels: HTMLElement[] = [];
  private firstTab: HTMLElement | null = null;
  // @ts-expect-error TS2564 Has no initializer => NOPE!
  private lastTab: HTMLElement;
  private isVertical = false;
  private forcePanelFocus: boolean;

  /**
   * Constructor
   *
   * @param tabContainer The parent element of the tabs (*should* have
   *                     ``role=tab`` applied).
   * @param forcePanelFocus Should the associated panels be made focussable?
   */
  constructor(tabContainer: HTMLElement, forcePanelFocus = false) {
    this.tabContainer = tabContainer;
    this.forcePanelFocus = forcePanelFocus;

    // Determine if we're dealing with vertical tabs (by default horizontal
    // tabs are assumed)
    if (this.tabContainer.getAttribute("aria-orientation") === "vertical") {
      this.isVertical = true;
    }

    // Identify the actual tabs.
    //
    // The calling code must take care of providing the required elements (most
    // likely this will be semantically correct elements like ``<a>`` or
    // ``<button>``) with the ``role="tab"`` and ``aria-controls`` attributes.
    this.tabs = Array.from(this.tabContainer.querySelectorAll("[role=tab]"));

    // Process the tabs and panels.
    this.tabs.forEach((tab) => {
      const panelId = tab.getAttribute("aria-controls");
      if (panelId === null) {
        throw new Error(
          "Tab does not provide required 'aria-controls' attribute"
        );
      }

      const panel = document.getElementById(panelId);
      if (panel === null) {
        throw new Error(`Referenced panel with id '${panelId}' does not exist`);
      }

      // At this point a valid tab/panel combination is identified
      tab.addEventListener("click", this.onTabClick.bind(this));
      tab.addEventListener("keydown", this.onTabKeydown.bind(this));

      this.panels.push(panel);

      if (this.firstTab === null) {
        this.firstTab = tab;
      }
      this.lastTab = tab;
    });

    // @ts-expect-error TS2345 firstTab might be null => NOPE!
    this.activateTab(this.firstTab, false);
  }

  /**
   * Activate a tab/panel combination.
   *
   * The method does apply/modify the tabs' ``aria-selected`` attributes and
   * the panels' ``aria-expanded`` attributes. Activated tab/panel combinations
   * will have ``aria-selected`` and ``aria-expanded`` set to ``true``. No
   * directly style related things are applied, thus the stylesheet is
   * required to operate on this attributes (e.g ``[aria-controls=true]`` as
   * selector).
   */
  private activateTab(thisTab: HTMLElement, setFocus = true): void {
    const panelId = thisTab.getAttribute("aria-controls");

    // Iterate panels
    this.panels.forEach((panel) => {
      panel.setAttribute("aria-expanded", "false");
      if (this.forcePanelFocus === true) {
        panel.tabIndex = -1;
      }

      if (panel.getAttribute("id") === panelId) {
        panel.setAttribute("aria-expanded", "true");
        if (this.forcePanelFocus === true) {
          panel.tabIndex = 0;
        }
      }
    });

    // Iterate tabs
    this.tabs.forEach((tab) => {
      tab.setAttribute("aria-selected", "false");
      // Only the currently active tab should be part of the document's tabbing
      // order, so use ``tabIndex = -1`` here.
      tab.tabIndex = -1;

      if (tab === thisTab) {
        tab.setAttribute("aria-selected", "true");
        // This is the currently active tab, include it in the document's
        // tabbing order (don't interfere with the document's structure here!)
        tab.tabIndex = 0;

        // Move the focus to this tab.
        //
        // There are only very few scenarios, where we don't want to do this
        // (e.g. during class instantiation).
        if (setFocus !== false) {
          tab.focus();
        }
      }
    });
  }

  private activateNextTab(currentTab: HTMLElement): void {
    if (currentTab === this.lastTab) {
      this.activateTab(this.firstTab as HTMLElement);
    } else {
      const index = this.tabs.indexOf(currentTab);
      this.activateTab(this.tabs[index + 1] as HTMLElement);
    }
  }

  private activatePreviousTab(currentTab: HTMLElement): void {
    if (currentTab === this.firstTab) {
      this.activateTab(this.lastTab);
    } else {
      const index = this.tabs.indexOf(currentTab);
      this.activateTab(this.tabs[index - 1] as HTMLElement);
    }
  }

  /**
   * Handle clicks on the tab elements.
   *
   * This method is attached to the *tabs* in the constructor.
   */
  private onTabClick(evt: MouseEvent): void {
    evt.stopPropagation();
    evt.preventDefault();

    this.activateTab(evt.currentTarget as HTMLElement);
  }

  /**
   * Handle keyboard input while a tab has focus.
   *
   * This method is attached to the *tabs* in the constructor.
   *
   * The method intercepts the following keyboard inputs and prevents further
   * propagation in the DOM. All other inputs are bubbled further.
   *
   * - End key (keyCode 35): activate the last tab
   * - Home key (keyCode 36): activate the first tab
   * - arrow keys (keyCodes 37 - 40): activate the next/previous tab (please
   *   note: up/down and left/right are mutually exclusive and dependent on
   *   the ``isVertical`` attribute. The inputs are bubbled further, if they
   *   are not matching semantically (e.g. "up arrow" is bubbled if the tabs
   *   are horizontal).
   */
  private onTabKeydown(evt: KeyboardEvent): void {
    let handledFinally = false;

    switch (evt.keyCode) {
      case 35: // end key
        this.activateTab(this.lastTab);
        handledFinally = true;
        break;
      case 36: // home key
        this.activateTab(this.firstTab as HTMLElement);
        handledFinally = true;
        break;
      case 37: // left arrow
        if (this.isVertical === false) {
          this.activatePreviousTab(evt.currentTarget as HTMLElement);
          handledFinally = true;
        }
        break;
      case 38: // up arrow
        if (this.isVertical === true) {
          this.activatePreviousTab(evt.currentTarget as HTMLElement);
          handledFinally = true;
        }
        break;
      case 39: // right arrow
        if (this.isVertical === false) {
          this.activateNextTab(evt.currentTarget as HTMLElement);
          handledFinally = true;
        }
        break;
      case 40: // down arrow
        if (this.isVertical === true) {
          this.activateNextTab(evt.currentTarget as HTMLElement);
          handledFinally = true;
        }
        break;
      default:
        break;
    }

    if (handledFinally !== false) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  }
}