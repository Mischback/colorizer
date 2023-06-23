// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

export { DragToOrder } from "./drag-to-order";
export type { TDragToOrderDragResultCallback } from "./drag-to-order";
export { mHash } from "./murmurhash";

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

/**
 * Round a ``Number`` to a given precision.
 *
 * @param num The number to be rounded.
 * @param precision The desired amount of decimal places.
 * @returns The rounded ``Number``.
 *
 * See https://stackoverflow.com/a/11832950 for reference.
 */
export function roundToPrecision(num: number, precision = 0): number {
  const precCalc = Math.pow(10, Math.floor(precision));

  return Math.round((num + Number.EPSILON) * precCalc) / precCalc;
}
