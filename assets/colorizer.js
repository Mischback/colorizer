/* This is the overall engine that powers the web-based colorscheme builder.
 *
 * The engine includes functionalities to manage the palette, providing the
 * application's general I/O including the *database layer*. The palette is
 * stored in the browser using IndexedDB.
 *
 * Beside the palette management another core functionality is the calculation
 * of contrast values between the colors.
 */

/**
 * A generic interface to the browser's IndexedDB.
 *
 * @param dbName The name of the database.
 * @param dbVersion The version of the database.
 *
 * Instances of this class are meant to provide an abstraction layer for the
 * actual database access. The class does provide the basic CRUD operations.
 *
 * As many parts of the app are implemented asynchronously, the methods of this
 * class work with callbacks which can be specified while calling the methods.
 *
 * References
 * ----------
 *  - https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase
 */
class DBInterface {
  constructor(dbName, dbVersion) {
    console.debug("DBInterface.constructor()");

    this.dbHandle;
    this.dbName = dbName;
    this.dbVersion = dbVersion;
  }

  /**
   * Open (and initialize) the database as required.
   *
   * @param stores A list of stores in the database.
   * @param successCallback A function to execute on successfully opening the
   *                        database.
   *
   * Note: The parameters are actually passed using an object literal, see
   * https://2ality.com/2011/11/keyword-parameters.html for reference.
   *
   * The method opens the database and stores a handle to it internally. It
   * will take care of proper initialization, depending on the instance's
   * ``dbVersion`` and the ``stores``.
   *
   * When the database is successfully opened, ``successCallback`` is executed.
   */
  openDatabase({stores = [], successCallback = (() => {})}) {
    if (!window.indexedDB) {
      console.error("IndexedDB not available!");
      return;
    }

    let openRequest = window.indexedDB.open(this.dbName, this.dbVersion);

    openRequest.addEventListener("error", () => {
      console.error("Could not open database");
      return;
    });

    openRequest.addEventListener("success", () => {
      console.debug("Database opened successfully");

      this.dbHandle = openRequest.result;

      // And now execute the specified successCallback!
      successCallback();
    });

    openRequest.addEventListener("upgradeneeded", (e) => {
      this.dbHandle = e.target.result;

      // Initialize the ObjectStores
      stores.forEach((store) => {
        console.debug("Creating ObjectStore " + store.name);
        this.dbHandle.createObjectStore(store.name, store.options);
      });
    });
  }

  getAll(storeName, successCallback=((result) => {})) {
    console.debug("getAll(): " + storeName);

    if (this.dbHandle) {
      let request = this.dbHandle.transaction(storeName).objectStore(storeName).openCursor(null, IDBCursor.NEXT);
      let results = [];

      request.addEventListener("success", (e) => {
        let cursor = e.target.result;
        if (cursor) {
          console.debug("Key: " + cursor.key + " Value: " + cursor.value);
          results.push({ [cursor.key]: cursor.value });
          cursor.continue();
        } else {
          console.log("Finished! " + results);
          successCallback(results);
        }
      });

      request.addEventListener("error", (e) => {
        console.error("Error while fetching items from " + storeName);
        console.debug(e.target.error);
      });
    }
  }
}


class PaletteItem {
  constructor(red, green, blue, sorting=0) {

    this.red = red;
    this.green = green;
    this.blue = blue;
    this.sorting = sorting;
  }
}


class ColorizerEngine {
  constructor(dbName="colorizer") {

    // Initialize the object's palette
    this.palette = [];

    this.paletteStoreName = "color_palette";

    const dbVersion = 1;
    const dbStores = [
      {
        name: this.paletteStoreName,
        options: {
          keyPath: "paletteItemID",
          autoIncrement: true,
        },
      },
    ];

    // Setup and initialize the database
    this.db = new DBInterface(dbName, dbVersion);

    // Open the database
    //
    // The ``successCallback`` must be explicitly bound to ``this``. See
    // https://stackoverflow.com/a/59060545 for reference!
    this.db.openDatabase({stores: dbStores, successCallback: this.fetchPaletteFromDatabase.bind(this)});
  }

  fetchPaletteFromDatabase() {
    console.log("fetchPaletteFromDatabase()");

    this.db.getAll(this.paletteStoreName, (result) => {
      console.log("success: " + result);
    });
  }

  addItemToPalette(item) {
    console.log("addItemToPalette() " + item.red + ", " + item.green + ", " + item.blue);
    console.log(item.sorting);
  }
}


// The following code is meant to be executed when the DOM is ready.
document.addEventListener("DOMContentLoaded", (e) => {
  console.debug("DOM ready, doing stuff!");

  // Initialize the actual engine. This object will provide the actual logic of
  // the application.
  let engine = new ColorizerEngine();
});
