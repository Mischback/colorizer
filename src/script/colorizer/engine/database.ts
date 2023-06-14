// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { openDB } from "idb";
import type { IColorizerPaletteItem } from "./palette";
import type { IDBPDatabase, DBSchema } from "idb";

interface ColorizerDbSchema extends DBSchema {
  palette: {
    key: string;
    value: IColorizerPaletteItem;
    indexes: { sorted: number };
  };
}
const ColorizerDbSchemaVersion = 1;

export class ColorizerDatabase {
  private dbName: string;
  private dbVersion: number;
  private db;

  public constructor(
    dbName = "colorizer",
    dbVersion: number = ColorizerDbSchemaVersion
  ) {
    if (!("indexedDB" in window)) {
      throw new Error("Fatal! No support for IndexedDB!");
    }

    this.dbName = dbName;
    this.dbVersion = dbVersion;

    this.db = openDB<ColorizerDbSchema>(this.dbName, this.dbVersion, {
      upgrade: this.setupDatabase.bind(this),
      terminated: this.handleTermination.bind(this),
    });
  }

  /**
   * Provide the required setup of the IndexedDB database.
   *
   * @param upgradeDb A local handle to the database, meant to perform the
   *                  setup operation.
   * @param oldVersion The current version of the database, as found in the
   *                   client. Will be ``0`` if the application is launched for
   *                   the very first time.
   * @param newVersion The applications current version, as provided in the
   *                   call to ``openDB()``. After running this method, the
   *                   client's version will be equal to this value.
   *
   * This method is applied to the ``openDB()`` call (see ``constructor()``).
   * In the default IndexedDB API this would be the ``upgradeneeded`` callback.
   */
  private setupDatabase(
    upgradeDb: IDBPDatabase<ColorizerDbSchema>,
    oldVersion: number,
    newVersion: number | null
  ): void {
    console.info(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      `Perform setup of database (from v${oldVersion} to v${newVersion})`
    );

    // Apply versioning the to DbSchema!
    //
    // This kluge is based on https://web.dev/indexeddb/#versioning
    // It (deliberatly) falls through the cases, kind of applying database
    // migrations.
    //
    // ``eslint`` complains, if variables/constants are declared in ``case``
    // clauses, so the ``paletteStore`` is declared outside of the ``switch``
    // block (no-case-declarations).
    let paletteStore;
    switch (oldVersion) {
      case 0:
        paletteStore = upgradeDb.createObjectStore("palette", {
          keyPath: "paletteItemId",
        });
        paletteStore.createIndex("sorted", "sorting");
    }
  }

  /**
   * Handle abnormal terminations of the connection to the IndexedDB database.
   *
   * This method is applied to the ``openDB()`` call (see ``constructor()``).
   * In the default IndexedDB API this would be the ``terminated`` callback.
   */
  private handleTermination(): void {
    console.error(this.db); // for whatever it is worth!
    throw new Error("Connection to IndexedDB terminated abnormally");
  }
}
