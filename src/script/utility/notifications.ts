// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

export class NotificationEngine {
  constructor(container: HTMLElement | null) {
    if (container === null) {
      throw new Error("No container provided");
    }
    console.debug("launched NotificationEngine");
  }
}
