// SPDX-FileCopyrightText: 2023 Mischback
// SPDX-License-Identifier: MIT
// SPDX-FileType: SOURCE

import { openDB } from "idb";
import type { IDBPDatabase, DBSchema } from "idb";
import type { ColorizerColor } from "../lib/color";

interface ColorizerDBSchema extends DBSchema {
  colorizer: {
    key: string;
    value: {
      paletteItemId: string;
      sorting: number;
      color: ColorizerColor;
    };
  };
}

export class ColorizerDatabase {
  private dbName: string;
  private dbVer: number;
  // @ts-expect-error TS6133 value never read
  private db;

  public constructor(dbName = "colorizer", dbVer = 1) {
    if (!("indexedDB" in window)) {
      throw new Error("Fatal! No support for IndexedDB!");
    }

    this.dbName = dbName;
    this.dbVer = dbVer;

    this.db = openDB<ColorizerDBSchema>(this.dbName, this.dbVer, {
      upgrade: this.setupDatabase.bind(this),
    });
  }

  private setupDatabase(
    upgradeDb: IDBPDatabase<ColorizerDBSchema>,
    oldVersion: number,
    newVersion: number | null
  ): void {
    console.log("setupDatabase()");
    console.debug(`oldVersion: ${oldVersion}`);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.debug(`newVersion: ${newVersion}`);

    /* eslint-disable @typescript-eslint/no-unused-vars */
    // @ts-expect-error TS6133 value never read
    const colorizerObjectStore = upgradeDb.createObjectStore("colorizer", {
      keyPath: "paletteItemId",
    });
    /* eslint-enable @typescript-eslint/no-unused-vars */
  }
}
