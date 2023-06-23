// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

export class NotificationEngine {
  container: HTMLElement;
  cssErrorClass: string;
  cssFadeClass: string;
  cssInfoClass: string;
  fadeDuration: number;
  visibleTimeout: number;

  constructor(
    container: HTMLElement | null,
    visibleTimeout = 1000,
    cssErrorClass = "error",
    cssInfoClass = "info",
    cssFadeClass = "notify-fade-out",
    fadeDuration = 500
  ) {
    if (container === null) {
      throw new Error("No container provided");
    }
    this.container = container;
    this.cssErrorClass = cssErrorClass;
    this.cssInfoClass = cssInfoClass;
    this.cssFadeClass = cssFadeClass;
    this.fadeDuration = fadeDuration;
    this.visibleTimeout = visibleTimeout;
  }

  public addMessage(
    message: string,
    cssClass = "message",
    timeout: number | false = this.visibleTimeout
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
        this.removeMessageAutomatically(notification);
      }, timeout);
    } else {
      // Create a button to close the notification!
      const dismiss = document.createElement("button");
      dismiss.setAttribute("type", "button");
      dismiss.innerHTML = "dismiss";
      dismiss.addEventListener("click", () => {
        this.removeMessageManually(notification);
      });
      notification.appendChild(dismiss);
    }
  }

  public addInfo(message: string, timeout: number | false = 1000) {
    this.addMessage(message, this.cssInfoClass, timeout);
  }

  public addError(message: string) {
    this.addMessage(message, this.cssErrorClass, false);
  }

  private removeMessageManually(notification: HTMLElement) {
    this.removeMessage(notification, 250);
  }

  private removeMessageAutomatically(notification: HTMLElement) {
    this.removeMessage(notification, this.fadeDuration);
  }

  private removeMessage(notification: HTMLElement, fadeDuration: number): void {
    notification.classList.add(this.cssFadeClass);
    setTimeout(() => {
      this.container.removeChild(notification);
    }, fadeDuration);
  }
}
