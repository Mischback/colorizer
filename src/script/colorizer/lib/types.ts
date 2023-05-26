// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { ColorizerColor } from "./color";

/**
 * Type for an Observer that receives updates of a ``color``.
 *
 * This is part of the implementation of the Observer pattern.
 */
export interface IColorizerObserver {
  updateColor(color: ColorizerColor): void;
}

/**
 * Type for a Subject that will propagate its (internal) ``color``.
 *
 * This is part of the implementation of the Observer pattern.
 *
 * Please note: The actual ``notify()`` function, which is logically required
 * by the Observer pattern, is not included in this interface, which leaves
 * its implementation and visibility to the implementing class (e.g.
 * ``ColorForm`` has a **private** ``notifyColorObservers()`` method).
 */
export interface IColorizerSubject {
  addColorObserver(obs: IColorizerObserver): void;
  removeColorObserver(obs: IColorizerObserver): void;
}
