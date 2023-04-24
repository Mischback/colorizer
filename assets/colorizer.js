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
          results.push(cursor.value);
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

  /**
   * Map a given contrast value to its W3C category.
   *
   * @param contrastValue A contrast value as number, most likely a ``float``.
   * @returns ``string`` One of ``AAA``, ``AA``, ``A`` or ``FAIL``.
   *
   * The classification is based on
   * https://www.w3.org/TR/UNDERSTANDING-WCAG20/visual-audio-contrast-contrast.html
   */
  w3Category: function(contrastValue) {
    switch(true) {
      case contrastValue >= 7:
        return "AAA";
        break;
      case contrastValue >= 4.5:
        return "AA";
        break;
      case contrastValue >= 3:
        return "A";
        break;
      default:
        return "FAIL";
        break;
    }
  },

  /**
   * Determine the contrast between two colors.
   *
   * @param c1 One color.
   * @param c2 The other color.
   * @returns The contrast ratio, a value between 1..21.
   *
   * The *common notation* of contrast values is something like ``6.1:1``. This
   * function would then return ``6.1``.
   *
   * The formula is taken from
   * https://www.w3.org/TR/WCAG20/#contrast-ratiodef but the implementation is
   * most likely based on a StackOverflow answer that I failed to reference.
   * My bad, sorry!
   */
  contrast: function(c1, c2) {
    var lum1 = ColorizerUtility.luminance(c1.red, c1.green, c1.blue);
    var lum2 = ColorizerUtility.luminance(c2.red, c2.green, c2.blue);
    var brighter = Math.max(lum1, lum2);
    var darker = Math.min(lum1, lum2);
    return (brighter + 0.05) / (darker + 0.05);
  },

  /**
   * Determine the *relative luminance* of a color.
   *
   * @param red The red component of the color.
   * @param green The green component of the color.
   * @param blue The blue component of the color.
   * @returns The relative luminance, normalized to a value between 0 and 1.
   *
   * The formula is taken from
   * https://www.w3.org/TR/WCAG20/#relativeluminancedef (which might not be
   * the original source). The implementation is - almost definitely - not my
   * own. Most likely it is a StackOverflow answer that I failed to reference.
   * My bad, sorry!
   *
   * See the corresponding method ``luminance()`` of ``PaletteItem``.
   */
  luminance: function(red, green, blue) {
    var a = [red, green, blue].map(function(v) {
      v /= 255;
      return v <= 0.03928
        ? v / 12.92
        : Math.pow((v+0.055) / 1.055, 2,4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  },
}

/**
 * Represent a single color of the palette.
 *
 * @param red The red color component.
 * @param green The green color component.
 * @param blue the blue color component.
 * @param sorting The internal sorting of the palette, default ``0``.
 *
 * The color is internally represented in the (s)RGB model.
 */
class PaletteItem {
  constructor(red, green, blue, sorting=0) {

    this.red = red;
    this.green = green;
    this.blue = blue;
    this.sorting = sorting;
  }

  /**
   * Return the *relative luminance* of the color.
   *
   * Internally this relies on ``ColorizerUtility.luminance()``.
   */
  luminance() {
    return ColorizerUtility.luminance(this.red, this.green, this.blue);
  }

  /**
   * Return the color in a CSS-compatible notation.
   *
   * The string is of the form ``rgb([0..255], [0..255], [0..255])``.
   */
  toCssRgb() {
    return "rgb(" + this.red + ", " + this.green + ", " + this.blue +")";
  }

  /**
   * Return the color in hex notation.
   *
   * The string includes the ``#``.
   *
   * The implementation is based on https://stackoverflow.com/a/5624139
   */
  toRgbHex() {
    return "#" + (1 << 24 | this.red << 16 | this.green << 8 | this.blue).toString(16).slice(1);
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

    // Store a reference to the ``ColorizerEngine``
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

    this.contrast_grid = document.querySelector("#contrast-grid");
    if (this.contrast_grid === null) {
      console.error("Missing required element with id '#contrast-grid'");
    }

    // Apply EventHandler functions
    this.ctrl_toggle.addEventListener("click", (e) => {
      this.ctrl_toggle_click(e);
    });

    this.color_add_form_hex.addEventListener("submit", (e) => {
      this.color_add_hex_submit(e);
    });

    // Register Observer callbacks for the engine's palette
    this.engine.observePalette(this.buildContrastGrid.bind(this));
    this.engine.observePalette(this.updatePaletteDisplay.bind(this));
  }

  /**
   * Create a DOM element for the *contrast grid*, representing a single
   * combination of *background* and *foreground* color.
   *
   * @param background The background color as ``PaletteItem``.
   * @param foreground The foreground color as ``PaletteItem``.
   * @returns DOM element
   *
   * The grid element is basically a ``<div>`` and contains the following
   * information:
   *   - the W3C category of the contrast value, see
   *     ``ColorizerUtility.w3Category()``
   *   - the actual contrast value, see ``ColorizerUtility.contrast()``
   *   - the color value in hex notation
   */
  generateContrastGridElement(background, foreground) {

    console.debug("generateContrastGridElement()");
    console.debug("Background: " + background.toRgbHex());
    console.debug("Foreground: " + foreground.toRgbHex());

    // Declare some variables for future use and re-use
    let contentContainer;
    let contentNode;
    let contrastValue;

    let gridElement = document.createElement("div");
    gridElement.classList.add("grid-element");
    gridElement.style.cssText = "background-color: " + background.toCssRgb() + "; color: " + foreground.toCssRgb() + ";";

    contrastValue = ColorizerUtility.contrast(background, foreground);

    contentContainer = document.createElement("div");
    contentContainer.classList.add("w3cat");
    contentContainer.appendChild(document.createTextNode(ColorizerUtility.w3Category(contrastValue)));
    gridElement.appendChild(contentContainer);

    contentContainer = document.createElement("div");
    contentContainer.classList.add("contrast-value");
    contentContainer.appendChild(document.createTextNode(contrastValue.toFixed(2)));
    gridElement.appendChild(contentContainer);

    contentContainer = document.createElement("div");
    contentContainer.classList.add("color-value");
    contentContainer.appendChild(document.createTextNode(foreground.toRgbHex()));
    gridElement.appendChild(contentContainer);

    return gridElement;
  }

  /**
   * Generate the *contrast grid*.
   *
   * @param palette A list of ``PaletteItem`` instances.
   *
   * The *contrast grid* is one of the core functions of the application, as
   * it visualizes the contrast values between the colors of the application's
   * color palette.
   *
   * The actual palette is managed in the ``ColorizerEngine`` class. This method
   * handles the visualization by manipulating the DOM (including the creation
   * of new DOM elements).
   *
   * This method is *attached* to the engine's palette with a quick and dirty
   * implementation of the Observer pattern (see the ``constructor()`` of this
   * class for details).
   */
  buildContrastGrid(palette) {
    console.debug("buildContrastGrid()");
    console.debug(palette);

    let grid_row;

    // empty the existing grid to prevent duplicates
    while (this.contrast_grid.firstChild) {
      this.contrast_grid.removeChild(this.contrast_grid.firstChild);
    }

    for (let i=0; i<palette.length; i++) {
      grid_row = document.createElement("div");
      grid_row.classList.add("grid-row");

      for (var j=0; j<palette.length; j++) {
        grid_row.appendChild(this.generateContrastGridElement(palette[i], palette[j]));
      }

      this.contrast_grid.appendChild(grid_row);
    }
  }

  /**
   * Update the visualization of the palette.
   *
   * @param palette A list of ``PaletteItem`` instances.
   *
   * The actual palette is managed in the ``ColorizerEngine`` class. This method
   * handles the visualization by manipulating the DOM (including the creation
   * of new DOM elements).
   *
   * This method is *attached* to the engine's palette with a quick and dirty
   * implementation of the Observer pattern (see the ``constructor()`` of this
   * class for details).
   */
  updatePaletteDisplay(palette) {
    console.debug("updatePaletteDisplay()");
    console.debug(palette);
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

    // Provide a list of observers of the palette
    //
    // This is a quick and dirty implementation of the Observer pattern. See
    // the ``observePalette()`` method for the registration function and the
    // implementation of ``updatePalette()`` for the calling of the observers.
    this.paletteObservers = [];

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

  /**
   * Register a callback function for palette updates.
   *
   * @param cb The callback to be executed.
   *
   * Part of the quick and dirty implementation of the Observer pattern. See
   * the class's attribute ``paletteObservers`` and the ``updatePalette()``
   * method.
   */
  observePalette(cb) {
    this.paletteObservers.push(cb);
  }

  updatePalette(newPalette) {
    console.debug("updatePalette()");

    this.palette = [];

    newPalette.forEach((item) => {
      this.palette.push(new PaletteItem(item.red, item.green, item.blue, item.sorting));
    });

    this.palette.sort((a, b) => {
      return a.sorting - b.sorting;
    });

    // Quick and dirty Observer pattern
    this.paletteObservers.forEach((obs) => {
      obs(this.palette);
    });
  }

  fetchPaletteFromDatabase() {
    console.debug("fetchPaletteFromDatabase()");

    this.db.getAll(this.paletteStoreName, (result) => {
      this.updatePalette(result);
    });
  }

  addItemToPalette(item) {
    console.log("addItemToPalette() " + item.red + ", " + item.green + ", " + item.blue + ", sorting: " + item.sorting);

    this.db.upsert(this.paletteStoreName, item, {transSuccessCallback: this.fetchPaletteFromDatabase.bind(this)});
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
