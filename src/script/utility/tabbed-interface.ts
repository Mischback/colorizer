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
 */
export class TabbedInterface {
  private tabContainer: HTMLElement;
  private tabs: HTMLElement[];
  private panels: HTMLElement[] = [];

  constructor(tabContainer: HTMLElement) {
    console.debug("TabbedInterface");

    this.tabContainer = tabContainer;

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
      this.panels.push(panel);
    });

    console.debug(this.tabs);
    console.debug(this.panels);
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

      if (panel.getAttribute("id") === panelId) {
        panel.setAttribute("aria-expanded", "true");
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

  /**
   * Handle clicks on the tab elements.
   *
   * This method is attached to the *tabs* in the constructor.
   */
  private onTabClick(evt: Event): void {
    evt.stopPropagation();
    evt.preventDefault();

    this.activateTab(evt.currentTarget as HTMLElement);
  }
}
