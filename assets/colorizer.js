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
   * The method opens the database and stores a handle to it internally. It
   * will take care of proper initialization, depending on the instance's
   * ``dbVersion`` and the ``stores``.
   *
   * When the database is successfully opened, ``successCallback`` is executed.
   */
  openDatabase(stores=[], successCallback=(() => {})) {
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

  getAll() {
    console.log("BAAAAR!");
  }
}


// The following code is meant to be executed when the DOM is ready.
document.addEventListener("DOMContentLoaded", (e) => {
  console.debug("DOM ready, doing stuff!");

  const idbName = "colorizer";
  const idbVersion = 1;
  const idbStores = [
    {
      name: "color_palette",
      options: {
        keyPath: "paletteItemID",
        autoIncrement: true,
      },
    },
  ];
  let idb = new DBInterface(idbName, idbVersion);

  function databaseReady() {
    console.log("Foooooooobar!");

    idb.getAll("color_palette");
  }

  idb.openDatabase(stores=idbStores, successCallback=databaseReady);
});
