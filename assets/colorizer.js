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

  /**
   * Update or insert data into the IndexedDB store.
   *
   * @param storeName The name of the store to insert into.
   * @param data The data to be inserted.
   * @param putSuccessCallback Callback function that is executed when the
   *                           ``put`` operation was successful.
   * @param transSuccessCallback Callback function that is executed when the
   *                             transaction was successful.
   *
   * Please note: ``putSuccessCallback`` and ``transSuccessCallback`` are
   * wrapped in an object literal, see
   * https://2ality.com/2011/11/keyword-parameters.html for reference.
   */
  upsert(storeName, data, {putSuccessCallback = (() => {}), transSuccessCallback = (() => {})} = {}) {
    console.debug("upsert(): " + storeName + ", " + data);

    if (this.dbHandle) {
      let transaction = this.dbHandle.transaction([storeName], "readwrite");
      transaction.addEventListener("complete", () => {
        console.debug("Transaction completed successfully");

        transSuccessCallback();
      });
      transaction.addEventListener("abort", (te) => {
        console.error("Transaction aborted!");
        console.debug(te.target.error);
      });
      transaction.addEventListener("error", (te) => {
        console.error("Transaction had error");
        console.debug(te.target.error);
      });

      let request = transaction.objectStore(storeName).put(data);
      request.addEventListener("success", () => {
        console.debug("PUT successful");

        putSuccessCallback();
      });
      request.addEventListener("error", (re) => {
        console.error("PUT had an error");
        console.debug(re.target.error);
      });
    }
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
          console.debug("Finished! " + results);
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


/**
 * Provide several utility functions in a dedicated object.
 *
 * This is implemented this way to make sure that the functions exist in a
 * dedicated namespace.
 */
const ColorizerUtility = {

  /**
   * Convert a hex-formatted color code to dedicated RGB values.
   *
   * @param hexColor The hex-formatted color code, provided as ``string``.
   * @returns ``array`` with dedicated R, G and B values.
   */
  hexToRGB: function(hexColor) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);

    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  },
}


class PaletteItem {
  constructor(red, green, blue, sorting=0) {

    this.red = red;
    this.green = green;
    this.blue = blue;
    this.sorting = sorting;
  }
}


/**
 * All interface-related stuff wrapped in a dedicated class.
 *
 * @param engine A reference to the ``ColorizerEngine`` instance.
 *
 * The constructor does all of the heavy lifting: it retrieves the elemens
 * from the DOM and attaches the corresponding event handlers.
 *
 * This follows the idea of progressive enhancement, meaning this class **must**
 * be instantiated when the DOM is ready!
 */
class ColorizerInterface {
  constructor(engine) {

    this.engine = engine;

    // Get DOM elements
    this.ctrl_toggle = document.querySelector("#ctrl-toggle");
    if (this.ctrl_toggle === null) {
      console.error("Missing required element with id '#ctrl-toggle'");
    }

    this.ctrl_container = document.querySelector("#ctrl");
    if (this.ctrl_container === null) {
      console.error("Missing required element with id '#ctrl'");
    }

    this.color_add_form_hex = document.querySelector("#color-add-hex");
    if (this.color_add_form_hex === null) {
      console.error("Missing required element with id '#color-add-hex'");
    }

    this.color_add_input_hex = document.querySelector("#new-color-hex");
    if (this.color_add_input_hex === null) {
      console.error("Missing required element with id '#new-color-hex'");
    }

    // Apply EventHandler functions
    this.ctrl_toggle.addEventListener("click", (e) => {
      this.ctrl_toggle_click(e);
    });

    this.color_add_form_hex.addEventListener("submit", (e) => {
      this.color_add_hex_submit(e);
    });
  }

  /**
   * *Click* event handler for the button that shows/hides the control menu.
   *
   * @param e The DOM's ``click`` event.
   */
  ctrl_toggle_click(e) {
    if (this.ctrl_toggle.textContent === "<") {
      this.ctrl_toggle.textContent = ">";
      this.ctrl_container.style.cssText = "";
    } else {
      this.ctrl_toggle.textContent = "<";
      this.ctrl_container.style.cssText = "left: 0;";
    }
  }

  /**
   * *Submit* event handler for the form that is meant to add new colors by
   * hex values.
   *
   * @param e The DOM's ``submit`` event.
   *
   * The method parses the hex string into actual R, G and B values (using
   * the ``ColorizerUtility.hexToRGB`` function), creates a temporary instance
   * of ``PaletteItem`` and asks the engine to add this item to the actual
   * palette.
   */
  color_add_hex_submit(e) {
    // don't actually submit the form, intercept with this code
    e.preventDefault();

    console.debug("Color (hex): " + this.color_add_input_hex.value);
    let color = ColorizerUtility.hexToRGB(this.color_add_input_hex.value);
    if (color === null)
      // leave the function if the input can not be parsed as hex color code
      return;
    console.debug(color);

    let item = new PaletteItem(color[0], color[1], color[2]);
    console.debug(item);

    this.engine.addItemToPalette(item);
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
    console.debug("fetchPaletteFromDatabase()");

    this.db.getAll(this.paletteStoreName, (result) => {
      console.log("success: " + result);
      result.forEach((item) => {
        console.log(item);
      });
    });
  }

  addItemToPalette(item) {
    console.log("addItemToPalette() " + item.red + ", " + item.green + ", " + item.blue + ", sorting: " + item.sorting);

    this.db.upsert(this.paletteStoreName, item);
  }
}


// The following code is meant to be executed when the DOM is ready.
document.addEventListener("DOMContentLoaded", (e) => {
  console.debug("DOM ready, doing stuff!");

  // Initialize the actual engine. This object will provide the actual logic of
  // the application.
  let engine = new ColorizerEngine();

  let io = new ColorizerInterface(engine);
});
