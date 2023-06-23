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

  public addMessage(
    message: string,
    cssClass = "message",
    timeout: number | false = 1000
  ) {
    const notification = document.createElement("section");
    notification.classList.add(cssClass);

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

  public addInfo(message: string, timeout: number | false = 1000) {
    this.addMessage(message, "info", timeout);
  }

  public addError(message: string) {
    this.addMessage(message, "error", false);
  }

  private removeMessage(notification: HTMLElement): void {
    // FIXME: Better add a CSS class here. Incorporate transition!
    // TODO: CSS class name should be configurable (with default value)
    // FIXME: Make the fade-out interval configurable!
    notification.classList.add("notify-fade-out");
    setTimeout(() => {
      this.container.removeChild(notification);
    }, 500);
  }
}
