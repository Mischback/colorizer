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
  // @ts-expect-error TS6133 value never read
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
    });
  }

  private setupDatabase(
    upgradeDb: IDBPDatabase<ColorizerDbSchema>,
    oldVersion: number,
    newVersion: number | null
  ): void {
    console.log(
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
}
