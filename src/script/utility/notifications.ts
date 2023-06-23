// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

export class NotificationEngine {
  container: HTMLElement;

  constructor(container: HTMLElement | null) {
    if (container === null) {
      throw new Error("No container provided");
    }
    this.container = container;
  }

  public addMessage(message: string, timeout: number | false = 1000) {
    const notification = document.createElement("section");
    notification.classList.add("message");

    const messageBody = document.createElement("p");
    messageBody.innerHTML = message;
    notification.appendChild(messageBody);

    this.container.appendChild(notification);

    if (timeout !== false) {
      // Trigger automatic removal of the notification with a timeout
      setTimeout(() => {
        this.removeMessage(notification);
      }, timeout);
    } else {
      // Create a button to close the notification!
      const dismiss = document.createElement("button");
      dismiss.setAttribute("type", "button");
      dismiss.innerHTML = "dismiss";
      dismiss.addEventListener("click", () => {
        this.removeMessage(notification);
      });
      notification.appendChild(dismiss);
    }
  }

  private removeMessage(notification: HTMLElement): void {
    // FIXME: Better add a CSS class here. Incorporate transition!
    // TODO: CSS class name should be configurable (with default value)
    // FIXME: Make the fade-out interval configurable!
    notification.setAttribute("style", "opacity: 0.5");
    setTimeout(() => {
      this.container.removeChild(notification);
    }, 250);
  }
}
