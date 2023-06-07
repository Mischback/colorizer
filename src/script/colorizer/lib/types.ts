// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import type { ColorizerColor } from "./color";
import type { ColorizerPaletteItem } from "../interface/palette";

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
export interface IColorizerColorObservable {
  addColorObserver(obs: IColorizerColorObserver): void;
  removeColorObserver(obs: IColorizerColorObserver): void;
}

/**
 * Type for an Observer that receives updates of a ``color``.
 *
 * This is part of the implementation of the Observer pattern.
 */
export interface IColorizerColorObserver {
  updateColor(color: ColorizerColor): void;
}

/**
 * Type for a Subject that will notify Observers about changes to the internal
 * palette.
 *
 * This is part of the implementation of the Observer pattern.
 *
 * Please note: The actual ``notify()`` functions, which is logically required
 * by the Observer pattern, is not included in this interface, which leaves
 * its implementation and visibility to the implementing class.
 */
export interface IColorizerPaletteObservable {
  addPaletteObserver(obs: IColorizerPaletteObserver): void;
  removePaletteObserver(obs: IColorizerPaletteObserver): void;
}

/**
 * Type for an Observer that receives notifications about palette changes.
 *
 * This is part of the implementation of the Observer pattern.
 */
export interface IColorizerPaletteObserver {
  update(palette: ColorizerPaletteItem[]): void;
}
