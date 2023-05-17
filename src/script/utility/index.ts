// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

/**
 * Get a DOM element by a given query.
 *
 * This is a thin wrapper around ``querySelector()``, which throws an ``Error``
 * if no element could be found.
 */
export function getDomElement(
  root: Element | Document | null,
  query: string
): Element {
  // Start at ``document``, if ``root`` is unspecified
  if (root === null) {
    root = document;
  }

  const tmp = root.querySelector(query);
  if (tmp === null) {
    throw new Error(`Missing required DOM element with query '${query}'`);
  }

  return tmp;
}
