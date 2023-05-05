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

  #dbHandle;

  constructor(dbName, dbVersion) {
    this.#dbHandle = undefined;
    this.dbName = dbName;
    this.dbVersion = dbVersion;
  }

  /**
   * Open (and initialize) the database as required.
   *
   * @param stores A list of stores in the database.
   *               The required format of ``stores`` is described below.
   * @param successCallback A function to execute on successfully opening the
   *                        database. Default: a ``noop`` function.
   *
   * The method opens the database and stores a handle to it internally. It
   * will take care of proper initialization, depending on the instance's
   * ``dbVersion`` and the ``stores`` parameter.
   *
   * When the database is successfully opened, ``successCallback`` is executed.
   *
   * The ``stores`` parameter
   * ------------------------
   *
   * ``stores`` should be an ``Array`` of objects providing the following
   * attributes:
   *   - ``name``: The name of the store to be created.
   *   - ``options``: Options of that store, as specified here:
   *     https://developer.mozilla.org/en-US/docs/Web/API/IDBDatabase/createObjectStore#parameters
   *   - ``indices``: An ``Array`` of objects providing the following attributs:
   *     - ``indexName``: The name of the index.
   *     - ``keyPath``: The attribute to work on.
   *     - ``options``: Options of that index, as specified here:
   *       https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/createIndex#parameters
   *
   * The ``stores`` parameter is internally evaluated in the ``upgradeneeded``
   * handler and provides the required setup of the IndexedDB instance for the
   * application. With the current implementation it is possible to create
   * instances of ``ObjectStore`` as required and provide the means to create
   * indices (instances of ``IDBIndex``) as required.
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
      console.info("Database opened successfully");

      this.#dbHandle = openRequest.result;

      // And now execute the specified successCallback!
      successCallback();
    });

    openRequest.addEventListener("upgradeneeded", (e) => {
      this.#dbHandle = e.target.result;

      // Initialize the ObjectStores
      stores.forEach((storeConfig) => {
        console.info(`Creating ObjectStore "${storeConfig.name}"`);
        const store = this.#dbHandle.createObjectStore(storeConfig.name, storeConfig.options);

        if (Array.isArray(storeConfig.indices)) {
          storeConfig.indices.forEach((indexConfig) => {
            console.info(`Creating index "${indexConfig.indexName}" for objectStore "${storeConfig.name}"`);
            store.createIndex(indexConfig.indexName, indexConfig.keyPath, indexConfig.options);
          });
        }
      });
    });
  }

  /**
   * Get a transaction for further use.
   *
   * @param storeName The objectStore to operate on.
   * @param mode The mode of the transaction (see
   *             https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/mode).
   *             Should be "readonly" or "readwrite".
   * @param transSuccessCallback Callback function that is executed when the
   *                             transaction was successful.
   *                             Default: ``undefined``.
   *
   * Please note: ``transSuccessCallback`` is wrapped in an object literal, see
   * https://2ality.com/2011/11/keyword-parameters.html for reference.
   *
   * This is a private method to get an IndexedDB ``transaction``to a given
   * store with a given mode. Optionally, a callback function can be provided
   * that is executed when the transaction completed successfully.
   */
  #getTransaction(storeName, mode, { transSuccessCallback=undefined } = {}) {
    // console.debug("#getTransaction()");
    // console.debug(`storeName: ${storeName}`);
    // console.debug(`mode: ${mode}`);
    // console.debug(`transSuccessCallback: ${transSuccessCallback}`);

    if (this.#dbHandle === undefined) {
      console.error("No handle to the database");
      return;
    }

    let transaction = this.#dbHandle.transaction([storeName], mode);
    transaction.addEventListener("abort", (e) => {
      console.error("Transaction aborted!");
      console.error(e.target.error);
    });
    transaction.addEventListener("error", (e) => {
      console.error("Transaction had an error");
      console.error(e.target.error);
    });

    // Only add the eventListener for ``complete``, if a callback function is
    // provided.
    if (transSuccessCallback !== undefined) {
      transaction.addEventListener("complete", () => {
        console.info("Transaction completed successfully");

        transSuccessCallback();
      });
    }

    return transaction;
  }

  /**
   * Update or insert data into the IndexedDB store.
   *
   * @param storeName The name of the store to insert into.
   * @param data The data to be inserted.
   * @param putSuccessCallback Callback function that is executed when the
   *                           ``put`` operation was successful.
   *                           Default: ``undefined``.
   * @param transSuccessCallback Callback function that is executed when the
   *                             transaction was successful.
   *                             Default: ``undefined``.
   *
   * Please note: ``putSuccessCallback`` and ``transSuccessCallback`` are
   * wrapped in an object literal, see
   * https://2ality.com/2011/11/keyword-parameters.html for reference.
   *
   * The event listener for the ``success`` event (of the ``put()`` operation)
   * and the ``success`` event (of the transaction) are only attached, if they
   * are  provided by the calling code
   * (see https://stackoverflow.com/a/52555073).
   */
  upsert(storeName, data, { putSuccessCallback=undefined, transSuccessCallback=undefined } = {}) {
    // console.debug(`upsert() on ${storeName}: ${data}`);

    let transaction = this.#getTransaction(storeName, "readwrite", {transSuccessCallback: transSuccessCallback});

    let request = transaction.objectStore(storeName).put(data);
    request.addEventListener("error", (e) => {
      console.error("upsert(): PUT had an error");
      console.error(e.target.error);
    });

    // Only add the eventListener for ``success``, if a callback function is
    // provided.
    if (putSuccessCallback !== undefined) {
      request.addEventListener("success", () => {
        console.info("upsert(): PUT successful");

        putSuccessCallback();
      });
    }
  }

  /**
   * Delete an item from the IndexedDB store, specified by its ``key``.
   *
   * @param storeName The name of the store.
   * @param key The key of the item to be deleted.
   * @param deleteSuccessCallback Callback function that is executed when the
   *                           ``delete`` operation was successful.
   *                           Default: ``undefined``.
   * @param transSuccessCallback Callback function that is executed when the
   *                             transaction was successful.
   *                             Default: ``undefined``.
   *
   * Please note: ``deleteSuccessCallback`` and ``transSuccessCallback`` are
   * wrapped in an object literal, see
   * https://2ality.com/2011/11/keyword-parameters.html for reference.
   *
   * The event listener for the ``success`` event (of the ``delete()``
   * operation) and the ``success`` event (of the transaction) are only
   * attached, if they are  provided by the calling code
   * (see https://stackoverflow.com/a/52555073).
   */
  deleteByKey(storeName, key, { deleteSuccessCallback=undefined, transSuccessCallback=undefined } = {}) {
    //console.debug(`deleteByKey() on ${storeName}: ${key}`);

    let transaction = this.#getTransaction(storeName, "readwrite", {transSuccessCallback: transSuccessCallback});

    let request = transaction.objectStore(storeName).delete(key);
    request.addEventListener("error", (e) => {
      console.error("deleteByKey(): DELETE had an error");
      console.error(e.target.error);
    });

    // Only add the eventListener for ``success``, if a callback function is
    // provided.
    if (deleteSuccessCallback !== undefined) {
      request.addEventListener("success", () => {
        console.info("deleteByKey(): DELETE successful");

        deleteSuccessCallback();
      });
    }
  }

  /**
   * Update many items in the database.
   *
   * @param storeName The name of the store.
   * @param bulkData An array of data objects to be update in the store.
   * @param transSuccessCallback Callback function that is executed when the
   *                             transaction was successful.
   *                             Default: ``undefined``.
   *
   * Please note: ``transSuccessCallback`` is wrapped in an object literal, see
   * https://2ality.com/2011/11/keyword-parameters.html for reference.
   *
   * The method iterates over all elements in the ObjectStore, tries to find
   * a corresponding item in ``bulkData`` and then updates all attributes of
   * the element and writes the updated object back to the ObjectStore.
   *
   * FIXME: How ObjectStore items are matched to items in ``bulkData`` is
   *        currently hardcoded. The cursor's ``key`` is matched against an
   *        attribute ``id``. THIS IS TOO TIGHTLY COUPLED!
   */
  bulkUpdate(storeName, bulkData, { transSuccessCallback=undefined } = {}) {

    let transaction = this.#getTransaction(storeName, "readwrite", {transSuccessCallback: transSuccessCallback});

    let request = transaction.objectStore(storeName).openCursor(null, "next");
    let current;
    let elem;

    request.addEventListener("success", (e) => {
      let cursor = e.target.result;

      if (cursor) {
        current = cursor.value;
        elem = bulkData.find((needle) => needle.id === cursor.key);
        if (elem !== undefined) {
          // Found a corresponding item in the bulkData, perform the update!
          Object.keys(current).forEach((k) => {
            if (elem[k] !== undefined)
              current[k] = elem[k];
          });

          cursor.update(current);
        }

        cursor.continue();
      }
    });
  }

  // https://stackoverflow.com/a/25055070
  getAll(storeName, successCallback=(() => {}), { dataIndex=undefined } = {}) {
    // console.debug(`getAll() from "${storeName}"`);

    let transaction = this.#getTransaction(storeName, "readonly");

    let store = transaction.objectStore(storeName);
    let request;
    let results = [];

    if (dataIndex === undefined) {
      request = store.openCursor(null, "next");
    } else {
      request = store.index(dataIndex).openCursor(null, "next");
    }

    request.addEventListener("success", (e) => {
      let cursor = e.target.result;
      if (cursor) {
        // console.debug("Key: " + cursor.key + " Value: " + cursor.value);
        results.push(cursor.value);
        cursor.continue();
      } else {
        // console.debug("Finished! " + results);
        successCallback(results);
      }
    });

    request.addEventListener("error", (e) => {
      console.error(`getAll(): Error while fetching items from ${storeName}`);
      console.error(e.target.error);
    });
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
  hexToRgb: function(hexColor) {
    let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);

    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null;
  },

  /**
   * Convert a color in RGB notation to hex-based notation.
   *
   * @param red Red component of the color in range 0..255.
   * @param green Green component of the color in range 0..255.
   * @param blue Blue component of the color in range 0..255.
   * @returns ``string`` with the color in hex-based notation (``#RRGGBB``).
   *
   * The implementation is based on https://stackoverflow.com/a/5624139
   */
  rgbToHex: function(red, green, blue) {
    return "#" + (1 << 24 | red << 16 | green << 8 | blue).toString(16).slice(1);
  },

  /**
   * Convert a color in HSL notation to dedicated RGB values.
   *
   * @param hue Hue of the color, given in *deg*. Internally normalized to a
   *            range of 360deg.
   * @param sat Saturation of the color, given in range 0..100 (this allows
   *            *percent-based* input, but **you must not** input percent
   *            values!).
   * @param light Lightness of the color, given in range 0..100 (this allows
   *              *percent-based* input, but **you must not** input percent
   *              values!).
   * @returns ``array`` with dedicated R, G and B values in range 0..255.
   *
   * The implementation is based on
   * https://www.w3.org/TR/css-color-4/#hsl-to-rgb with only minimal
   * modifications to adjust the output of the function.
   */
  hslToRgb: function(hue, sat, light) {
    hue = hue % 360;
    if (hue < 0)
      hue += 360;

    sat /= 100;
    light /= 100;

    function f(n) {
      let k = (n + hue/30) % 12;
      let a = sat * Math.min(light, 1 - light);
      return light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    }

    function norm(n) {
      return Math.round(n * 255);
    }

    return [norm(f(0)), norm(f(8)), norm(f(4))];
  },

  /**
   * Convert a color in RGB notation to hex-based notation.
   *
   * @param red Red component of the color in range 0..255.
   * @param green Green component of the color in range 0..255.
   * @param blue Blue component of the color in range 0..255.
   * @returns ``array`` with values for hue, saturation and lightness where
   *          ``hue`` is given in degress in range 0..360 and ``saturation``
   *          and ``lightness`` are given as percentages in range 0..100.
   *
   * The implementation is based on
   * https://www.w3.org/TR/css-color-4/#rgb-to-hsl with only minimal
   * modifications to adjust the input of the function.
   */
  rgbToHsl: function(red, green, blue) {
    red /= 255;
    green /= 255;
    blue /= 255;

    let max = Math.max(red, green, blue);
    let min = Math.min(red, green, blue);
    let [hue, sat, light] = [NaN, 0, (min + max) / 2];
    let d = max - min;

    if (d !== 0) {
      sat = (light === 0 || light === 1)
          ? 0
          : (max - light) / Math.min(light, 1 - light);

      switch (max) {
        case red:   hue = (green - blue) / d + (green < blue ? 6 : 0); break;
        case green: hue = (blue - red) / d + 2; break;
        case blue:  hue = (red - green) / d + 4; break;
      }
      hue = hue * 60;
    }

    return [hue, sat * 100, light * 100];
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

  twoDecimalPlaces: function(num) {
    return parseFloat(num).toFixed(2);
  },
}


/**
 * Represent a single color of the palette.
 *
 * @param red The red color component.
 * @param green The green color component.
 * @param blue the blue color component.
 * @param sorting The internal sorting of the palette, default ``0``.
 * @param id The ID of the element (this is auto-generated once the element is
 *           stored in the IndexDB).
 *
 * Please note: ``sorting`` and ``id`` are wrapped in an object literal, see
 * https://2ality.com/2011/11/keyword-parameters.html for reference.
 *
 * The color is internally represented in the (s)RGB model.
 */
class PaletteItem {
  constructor(red, green, blue, {sorting=0, id=undefined}={}) {

    this.red = red;
    this.green = green;
    this.blue = blue;
    this.sorting = sorting;
    this.id = id;
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
    return `rgb(${this.red}, ${this.green}, ${this.blue})`;
  }

  /**
   * Return the color in hex notation.
   *
   * The string is of the form ``#RRGGBB``, as returned by
   * ``ColorizerUtility.rgbToHex()``.
   */
  toRgbHex() {
    return ColorizerUtility.rgbToHex(this.red, this.green, this.blue);
  }
}


class ColorizerColorInputForm {

  // Private Attributes
  //
  // This is only the declaration, initialization has to be done elsewhere
  // (e.g. in the ``constructor()``).
  #currentColor;
  #currentColorObservers;
  #submitCallback;

  constructor(submitCallback=undefined) {
    // Fetch the #submitCallback or provide a generic one.
    if (submitCallback !== undefined) {
      this.#submitCallback = submitCallback;
    } else {
      this.#submitCallback = ((e) => {
        console.info(`Submitting form, #currentColor: (${this.#currentColor.r}, ${this.#currentColor.g}, ${this.#currentColor.b})`);
      });
    }

    // Get the DOM elements of the <form>
    //
    // The form's elements are fetched by their ``id`` attribute, which is -
    // as of now - hardcoded here.
    //
    // Because this class can't work without these DOM elements, instances of
    // ``Error`` are thrown if one of the required elements can't be found.
    this.form = document.querySelector("#color-add-form");
    if (this.form === null) {
      throw new Error("Missing required DOM element with id '#color-add-form'");
    }

    this.inputPick = document.querySelector("#new-color-pick");
    if (this.inputPick === null) {
      throw new Error("Missing required DOM element with id '#new-color-pick'");
    }

    this.inputHex = document.querySelector("#new-color-hex");
    if (this.inputHex === null) {
      throw new Error("Missing required DOM element with id '#new-color-hex'");
    }
    // Attach a validation pattern to the hex-based input.
    this.inputHex.pattern = "#[0-9A-Fa-f]{6}";

    this.inputRgbR = document.querySelector("#new-color-rgb-r");
    if (this.inputRgbR === null) {
      throw new Error("Missing required DOM element with id '#new-color-rgb-r'");
    }

    this.inputRgbG = document.querySelector("#new-color-rgb-g");
    if (this.inputRgbG === null) {
      throw new Error("Missing required DOM element with id '#new-color-rgb-g'");
    }

    this.inputRgbB = document.querySelector("#new-color-rgb-b");
    if (this.inputRgbB === null) {
      throw new Error("Missing required DOM element with id '#new-color-rgb-b'");
    }

    this.inputHslH = document.querySelector("#new-color-hsl-h");
    if (this.inputHslH === null) {
      throw new Error("Missing required DOM element with id '#new-color-hsl-h'");
    }

    this.inputHslS = document.querySelector("#new-color-hsl-s");
    if (this.inputHslS === null) {
      throw new Error("Missing required DOM element with id '#new-color-hsl-s'");
    }

    this.inputHslL = document.querySelector("#new-color-hsl-l");
    if (this.inputHslL === null) {
      throw new Error("Missing required DOM element with id '#new-color-hsl-l'");
    }

    // Attach event handlers to the DOM elements
    this.form.addEventListener("submit", (e) => {
      this.#submitCallback(e);
    });
    this.inputPick.addEventListener("change", this.#setColorFromInputPick.bind(this));
    this.inputHex.addEventListener("input", this.#setColorFromInputHex.bind(this));
    this.inputRgbR.addEventListener("input", this.#setColorFromInputRgb.bind(this));
    this.inputRgbG.addEventListener("input", this.#setColorFromInputRgb.bind(this));
    this.inputRgbB.addEventListener("input", this.#setColorFromInputRgb.bind(this));
    this.inputHslH.addEventListener("input", this.#setColorFromInputHsl.bind(this));
    this.inputHslS.addEventListener("input", this.#setColorFromInputHsl.bind(this));
    this.inputHslL.addEventListener("input", this.#setColorFromInputHsl.bind(this));

    // Initialize the list of Observers
    this.#currentColorObservers = [];

    this.registerColorObserver(this.#updateInputPick.bind(this));
    this.registerColorObserver(this.#updateInputHex.bind(this));
    this.registerColorObserver(this.#updateInputRgb.bind(this));
    this.registerColorObserver(this.#updateInputHsl.bind(this));

    // FIXME: This is only for development!
    this.registerColorObserver((c) => {
      console.debug(`[DEBUG] Color Change: (${c.r}, ${c.g}, ${c.b})`);
    });

    // Initialize the #currentColor attribute
    this.#setCurrentColor();
  }

  /**
   * Register a callback function for color updates.
   *
   * @param cb The callback to be executed. It will be called with the
   *           value of ``#currentColor``.
   *
   * Part of the quick and dirty implementation of the Observer pattern. See
   * the class's attribute ``#currentColorObservers`` and the
   * ``#setCurrentColor()`` method.
   */
  registerColorObserver(cb) {
    this.#currentColorObservers.push(cb);
  }

  /**
   * Set the ``#currentColor`` attribute.
   *
   * @param r Red component of the new color.
   * @param g Green component of the new color.
   * @param b Blue component of the new color.
   * @param cause Which input causes this update? Given as a ``string``.
   *
   * Please note: ``r``, ``g`` and ``b`` are wrapped in an object literal, see
   * https://2ality.com/2011/11/keyword-parameters.html for reference.
   *
   * This method is **private**.
   *
   * Part of the quick and dirty implementation of the Observer pattern. See
   * the class's attribute ``#currentColorObservers`` and the
   * ``registerColorObserver()`` method.
   */
  #setCurrentColor({r = 0, g = 0, b = 0, cause = ""} = {}) {
    this.#currentColor = { r: r, g: g, b: b};

    this.#currentColorObservers.forEach((cb) => {
      cb(this.#currentColor, cause);
    });
  }

  /**
   * Get the value of ``#currentColor``.
   *
   * @returns The value of ``#currentColor``, provided as object.
   *
   * This is the exernally available interface to access ``#currentColor``.
   */
  getCurrentColor() {
    return this.#currentColor;
  }

  /**
   * Set ``#currentColor`` from the color picker input field.
   *
   * @param e The DOM event.
   *
   * This method is attached as an EventHandler to the input field, see this
   * class's ``constructor()``.
   */
  #setColorFromInputPick(e) {
    let rgbColor = ColorizerUtility.hexToRgb(this.inputPick.value);
    this.#setCurrentColor({r: rgbColor[0], g: rgbColor[1], b: rgbColor[2]});
  }

  /**
   * Set ``#currentColor`` from the hex-based input field.
   *
   * @param e The DOM event.
   *
   * This method is attached as an EventHandler to the input field, see this
   * class's ``constructor()``.
   */
  #setColorFromInputHex(e) {
    // Check validity to minimize updates **while** editing the value
    if (e.target.validity.valid) {
      let rgbColor = ColorizerUtility.hexToRgb(this.inputHex.value);
      this.#setCurrentColor({r: rgbColor[0], g: rgbColor[1], b: rgbColor[2]});
    }
  }

  /**
   * Set ``#currentColor`` from the RGB input fields.
   *
   * @param e The DOM event.
   *
   * This method is attached as an EventHandler to the RGB-related input
   * fields, see this class's ``constructor()``.
   */
  #setColorFromInputRgb(e) {
    this.#setCurrentColor({
      r: this.inputRgbR.value,
      g: this.inputRgbG.value,
      b: this.inputRgbB.value,
    });
  }

  /**
   * Set ``#currentColor`` from the HSL input fields.
   *
   * @param e The DOM event.
   *
   * This method is attached as an EventHandler to the HSL-related input
   * fields, see this class's ``constructor()``.
   */
  #setColorFromInputHsl(e) {
    let hue = ColorizerUtility.twoDecimalPlaces(this.inputHslH.value);
    let sat = ColorizerUtility.twoDecimalPlaces(this.inputHslS.value);
    let light = ColorizerUtility.twoDecimalPlaces(this.inputHslL.value);

    let rgb = ColorizerUtility.hslToRgb(hue, sat, light);

    this.#setCurrentColor({
      r: rgb[0],
      g: rgb[1],
      b: rgb[2],
      cause: "hsl"
    });
  }

  /**
   * Update the color picker input field.
   *
   * @param newColor The new color as provided by ``#currentColor``.
   *
   * This method is attached as an Observer to the class's ``#currentColor``
   * attribute.
   */
  #updateInputPick(newColor) {
    this.inputPick.value = ColorizerUtility.rgbToHex(newColor.r, newColor.g, newColor.b);
  }

  /**
   * Update the hex-based input field.
   *
   * @param newColor The new color as provided by ``#currentColor``.
   *
   * This method is attached as an Observer to the class's ``#currentColor``
   * attribute.
   */
  #updateInputHex(newColor) {
    this.inputHex.value = ColorizerUtility.rgbToHex(newColor.r, newColor.g, newColor.b);
  }

  /**
   * Update the RGB input fields.
   *
   * @param newColor The new color as provided by ``#currentColor``.
   *
   * This method is attached as an Observer to the class's ``#currentColor``
   * attribute.
   */
  #updateInputRgb(newColor) {
    this.inputRgbR.value = newColor.r;
    this.inputRgbG.value = newColor.g;
    this.inputRgbB.value = newColor.b;
  }

  /**
   * Update the HSL input fields.
   *
   * @param newColor The new color as provided by ``#currentColor``.
   * @param cause Which input did cause this update?
   *
   * This method is attached as an Observer to the class's ``#currentColor``
   * attribute.
   */
  #updateInputHsl(newColor, cause) {

    // Do nothing, if the change of color was caused by the HSL inputs.
    // This ensures, that changes in the HSL inputs are not breaking.
    //
    // The internal color model is RGB, so changes to the HSL inputs are
    // translated directly to RGB. While converting RGB back to HSL, there are
    // *jumps* in hue, saturation and lightness, which are not desired.
    //
    // As of now, if the new color is caused by HSL inputs, the input fields
    // are simply not updated.
    //
    // FIXME: This might need attention when HWB input is implemented, as the
    //        ``H`` component is shared between these!
    if (cause === "hsl") return;

    let hsl = ColorizerUtility.rgbToHsl(newColor.r, newColor.g, newColor.b);

    let hue;
    if (isNaN(hsl[0])) {
      hue = ColorizerUtility.twoDecimalPlaces(0);
    } else {
      hue = ColorizerUtility.twoDecimalPlaces(hsl[0]);
    }

    let sat = ColorizerUtility.twoDecimalPlaces(hsl[1]);
    let light = ColorizerUtility.twoDecimalPlaces(hsl[2]);

    this.inputHslH.value = hue;
    this.inputHslS.value = sat;
    this.inputHslL.value = light;
  }
}


/**
 * All interface-related stuff wrapped in a dedicated class.
 *
 * @param engine A reference to the ``ColorizerEngine`` instance.
 *
 * The constructor does all of the heavy lifting: it retrieves the elements
 * from the DOM and attaches the corresponding event handlers.
 *
 * This follows the idea of progressive enhancement, meaning this class **must**
 * be instantiated when the DOM is ready!
 */
class ColorizerInterface {

  // Private attributes
  //
  // This is only the declaration, initialization has to be done elsewhere
  // (e.g. in the ``constructor()``).

  // These attributes are required to make Drag'n'Drop of PaletteItems work
  #draggedItem;
  #dropTarget;
  // This tracks the state of the control panel
  #ctrlContainerExpanded;

  constructor(engine) {

    this.#draggedItem = null;
    this.#dropTarget = null;
    this.#ctrlContainerExpanded = false;

    // Store a reference to the ``ColorizerEngine``
    this.engine = engine;

    // Initialize the color input form
    this.colorInputForm = new ColorizerColorInputForm(
      this.addItemToPalette.bind(this)
    );

    // Get DOM elements
    this.ctrl_toggle = document.querySelector("#ctrl-toggle");
    if (this.ctrl_toggle === null) {
      console.error("Missing required element with id '#ctrl-toggle'");
    }

    this.ctrl_container = document.querySelector("#ctrl");
    if (this.ctrl_container === null) {
      console.error("Missing required element with id '#ctrl'");
    }

    this.contrast_grid = document.querySelector("#contrast-grid");
    if (this.contrast_grid === null) {
      console.error("Missing required element with id '#contrast-grid'");
    }

    this.palette_list = document.querySelector("#color-palette ul");
    if (this.palette_list === null) {
      console.error("Missing required element with id '#color-palette ul'");
    }

    // Apply EventHandler functions
    this.ctrl_toggle.addEventListener("click", (e) => {
      this.ctrl_toggle_click(e);
    });

    // Register Observer callbacks for the engine's palette
    this.engine.registerPaletteObserver(this.buildContrastGrid.bind(this));
    this.engine.registerPaletteObserver(this.updatePaletteDisplay.bind(this));
    // TODO: Currently disabled, see TODO notice in the method's documentation!
    // this.engine.registerPaletteObserver(this.clearInputFieldsOnPaletteUpdate.bind(this));
  }

  /**
   * Create a DOM element for the *contrast grid*, representing a single
   * combination of *background* and *foreground* color.
   *
   * @param background The background color as ``PaletteItem``.
   * @param foreground The foreground color as ``PaletteItem``.
   * @returns DOM element
   *
   * This method is **private**.
   *
   * The grid element is basically a ``<div>`` and contains the following
   * information:
   *   - the W3C category of the contrast value, see
   *     ``ColorizerUtility.w3Category()``
   *   - the actual contrast value, see ``ColorizerUtility.contrast()``
   *   - the color value in hex notation
   */
  #generateContrastGridElement(background, foreground) {

    // console.debug("#generateContrastGridElement()");
    // console.debug(`Background: ${background.toRgbHex()}`);
    // console.debug(`Foreground: ${foreground.toRgbHex()}`);

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
   * Create a DOM element representing one palette item/color in the
   * application's control interface.
   *
   * @param paletteItem An instance of PaletteItem.
   *
   * This method is **private**.
   *
   * The list element contains a visual and textual representation of the
   * palette item/color and element-specific control elements, e.g. the button
   * to remove that item from the palette.
   */
  #generatePaletteListItem(paletteItem) {
    // console.debug("#generatePaletteListItem()");

    // Declare some variables for future use and re-use
    let elem;

    let listItem = document.createElement("li");
    listItem.setAttribute("palette-color-id", paletteItem.id);
    listItem.setAttribute("draggable", true);
    listItem.addEventListener("dragstart", (e) => {
      // console.debug(`DragStart of ${e.currentTarget.getAttribute("palette-color-id")} (${e.target} / ${e.currentTarget})`);

      this.#draggedItem = e.currentTarget;
    });
    listItem.addEventListener("dragend", (e) => {
      // console.debug(`DragEnd of ${e.currentTarget.getAttribute("palette-color-id")} (${e.target} / ${e.currentTarget})`);

      if ((this.#draggedItem !== null) && (this.#dropTarget !== null)) {
        // console.info("Successful drag!");
        // console.debug(`draggedItem: ${this.#draggedItem.getAttribute("palette-color-id")} (${this.#draggedItem})`);
        // console.debug(`dropTarget: ${this.#dropTarget.getAttribute("palette-color-id")} (${this.#dropTarget})`);

        this.engine.reorderPalette(this.#draggedItem.getAttribute("palette-color-id"), this.#dropTarget.getAttribute("palette-color-id"));
      }

      this.#draggedItem = null;
      this.#dropTarget = null;
    });
    listItem.addEventListener("dragenter", (e) => {
      if (e.currentTarget.contains(e.relatedTarget))
        return;

      if (this.#draggedItem === e.currentTarget)
        return;

      // console.debug(`DragEnter on ${e.currentTarget.getAttribute("palette-color-id")} (${e.target} / ${e.currentTarget})`);
      this.#dropTarget = e.currentTarget;
    });
    listItem.addEventListener("dragleave", (e) => {
      if (e.currentTarget.contains(e.relatedTarget))
        return;

      if (e.target !== e.currentTarget)
        return;

      // console.debug(`DragLeave on ${e.target} / ${e.currentTarget}`);
      this.#dropTarget = null;
    });

    elem = document.createElement("span");
    elem.textContent = paletteItem.toRgbHex();
    listItem.appendChild(elem);

    elem = document.createElement("div");
    elem.style.cssText = "background-color: " + paletteItem.toCssRgb() + ";";
    listItem.appendChild(elem);

    elem = document.createElement("button");
    elem.textContent = "remove";
    elem.addEventListener("click", (e) => {
      this.deleteItemFromPalette(e);
    });
    listItem.appendChild(elem);

    return listItem;
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
    // console.debug("buildContrastGrid()");
    // console.debug(palette);

    let grid_row;

    // empty the existing grid to prevent duplicates
    while (this.contrast_grid.firstChild) {
      this.contrast_grid.removeChild(this.contrast_grid.firstChild);
    }

    for (let i=0; i<palette.length; i++) {
      grid_row = document.createElement("div");
      grid_row.classList.add("grid-row");

      for (var j=0; j<palette.length; j++) {
        grid_row.appendChild(this.#generateContrastGridElement(palette[i], palette[j]));
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
    // console.debug("updatePaletteDisplay()");
    // console.debug(palette);

    // empty the existing palette to prevent duplicates
    while (this.palette_list.firstChild) {
      this.palette_list.removeChild(this.palette_list.firstChild);
    }

    for (let i=0; i<palette.length; i++) {
      this.palette_list.appendChild(this.#generatePaletteListItem(palette[i]));
    }
  }

  /**
   * Clear all input fields.
   *
   * This is meant to be attached as an Observer to the palette. Updates of the
   * palette are triggered if a palette item/color is added/updated/removed,
   * making the present input fields obsolete, thus, they can be cleared.
   *
   * This is a quick and dirty solution, but should work without major
   * drawbacks.
   *
   * TODO: This method is currently **not attached** to the palette, meaning
   *       that the form's input fields are not cleared/resetted but will
   *       provide the last added color for future use.
   */
  clearInputFieldsOnPaletteUpdate() {
    console.debug("[NOTE] Clearing input fields disabled (see TODO of this method)");
  }

  /**
   * Add an item to the palette.
   *
   * @param e The DOM event.
   *
   * This method is intended to handle the ``colorInputForm``'s ``submit``
   * event by fetching the form's current color and then calling the
   * ``engine``'s ``addItemToPalette()`` method, which will take care of the
   * database persistence.
   *
   * The method is supplied to ``ColorizerColorInputForm``'s constructor in
   * this class's ``constructor()``.
   */
  addItemToPalette(e) {
    // console.debug("addItemToPalette()");

    // don't actually submit the form, intercept with this code
    e.preventDefault();

    let color = this.colorInputForm.getCurrentColor();
    // console.debug(`color: (${color.r}, ${color.g}, ${color.b})`);
    this.engine.addItemToPalette(new PaletteItem(color.r, color.g, color.b));
  }

  /**
   * *Click* event handler for the button to remove palette items/colors.
   *
   * @param e The DOM's ``click`` event.
   */
  deleteItemFromPalette(e) {
    // console.debug("deleteItemFromPalette()");

    this.engine.deleteItemByID(
      Number(e.target.parentNode.getAttribute("palette-color-id"))
    );
  }

  /**
   * *Click* event handler for the button that shows/hides the control menu.
   *
   * @param e The DOM's ``click`` event.
   */
  ctrl_toggle_click(e) {
    if (this.#ctrlContainerExpanded === true) {
      this.#ctrlContainerExpanded = false;
      this.ctrl_toggle.textContent = "expand";
      this.ctrl_container.classList.remove("ctrl-expanded");
      this.ctrl_container.classList.add("ctrl-collapsed");
    } else {
      this.#ctrlContainerExpanded = true;
      this.ctrl_toggle.textContent = "collapse";
      this.ctrl_container.classList.remove("ctrl-collapsed");
      this.ctrl_container.classList.add("ctrl-expanded");
    }
  }
}


class ColorizerEngine {

  // Private Attributes
  //
  // This is only the declaration, initialization has to be done elsewhere
  // (e.g. in the ``constructor()``).
  #palette;
  #paletteObservers;
  #paletteStoreName;

  constructor(dbName="colorizer") {

    // Initialize the object's palette
    this.#palette = [];

    // Provide a list of observers of the palette
    //
    // This is a quick and dirty implementation of the Observer pattern. See
    // the ``registerPaletteObserver()`` method for the registration function
    // and the implementation of ``notifyPaletteObservers()`` for the calling
    // of the observers.
    this.#paletteObservers = [];

    // Provide the default *store name* for accessing the IndexedDB
    this.#paletteStoreName = "color_palette";

    const dbVersion = 1;
    const dbStores = [
      {
        name: this.#paletteStoreName,
        options: {
          keyPath: "paletteItemID",
          autoIncrement: true,
        },
        indices: [
          {
            indexName: "sorting",
            keyPath: "sorting",
            options: {},
          },
        ],
      },
    ];

    // Setup and initialize the database
    this.db = new DBInterface(dbName, dbVersion);

    // Open the database
    //
    // The ``successCallback`` must be explicitly bound to ``this``. See
    // https://stackoverflow.com/a/59060545 for reference!
    this.db.openDatabase(dbStores, this.refreshPaletteFromDB.bind(this));
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
  registerPaletteObserver(cb) {
    this.#paletteObservers.push(cb);
  }

  /**
   * Call the registered callback functions of Observers of the palette.
   */
  #notifyPaletteObservers() {
    this.#paletteObservers.forEach((cb) => {
      cb(this.#palette);
    });
  }

  /**
   * Refresh the internal list of colors from the database.
   *
   * The method accesses the IndexedDB and retrieves all colors/items. As this
   * operation is executed asynchronously, an anonymous function is used for
   * further processing, including sorting of the colors/items and notifying
   * the observers.
   */
  refreshPaletteFromDB() {
    // console.debug("refreshPaletteFromDB()");

    // Access the DB and provide an asynchronous callback function
    this.db.getAll(this.#paletteStoreName, (result) => {
      // Reset the existing palette
      this.#palette = [];

      // Create PaletteItem instances
      //
      // The ``sorting`` attribute is refreshed every time. This makes
      // reordering of the palette easy (implementation-wise). See
      // ``reorderPalette()`` for the details.
      let newSorting = 1;
      result.forEach((item) => {
        this.#palette.push(new PaletteItem(
          item.red, item.green, item.blue,
          { sorting: newSorting * 5, id: item.paletteItemID },
        ));
        newSorting++;
      });

      // Notify the Observers
      this.#notifyPaletteObservers();
    }, { dataIndex: "sorting" });
  }

  /**
   * Add a new color to the palette.
   *
   * @param item The new color, given as PaletteItem instance.
   *
   * This function stores the new color/item into the IndexedDB and then
   * triggers refreshing of the palette from the database.
   */
  addItemToPalette(item) {
    // console.debug(`addItemToPalette(): R: ${item.red}, G: ${item.green}, B: ${item.blue}`);

    this.db.upsert(this.#paletteStoreName, item, {transSuccessCallback: this.refreshPaletteFromDB.bind(this)});
  }

  /**
   * Delete a color/item from the palette.
   *
   * @param id The ID of the color/item.
   */
  deleteItemByID(id) {
    // console.debug(`deleteItemByID(): ${id}`);

    this.db.deleteByKey(this.#paletteStoreName, id, {transSuccessCallback: this.refreshPaletteFromDB.bind(this)});
  }

  /**
   * Put a PaletteItem instance to a new position in the palette.
   *
   * @param itemID The ID of the PaletteItem to be moved.
   * @param insertAfterID The ID of the PaletteItem that was the drop target,
   *                      the PaletteItem specified by ``itemID`` will be
   *                      inserted after this element.
   */
  reorderPalette(itemID, insertAfterID) {
    // console.debug(`reorderPalette(): ${itemID} to ${insertAfterID}`);

    const item = this.#palette.find((needle) => needle.id === Number(itemID));
    const insertAfter = this.#palette.find((needle) => needle.id === Number(insertAfterID));

    // Set ``sorting`` to a new value, depending on the *direction* of the
    // move.
    //
    // in ``refreshPaletteFromDB()``, the ``sorting`` attributes are set to
    // new values on every refresh. There is always room for another item
    // between two items, so this is safe.
    //
    // But it requires the update of all paletteItems in the database after
    // this modification (see below).
    if (item.sorting < insertAfter.sorting) {
      item.sorting = insertAfter.sorting + 1;
    } else {
      item.sorting = insertAfter.sorting - 1;
    }

    this.db.bulkUpdate(this.#paletteStoreName, this.#palette, {transSuccessCallback: this.refreshPaletteFromDB.bind(this)});
  }
}


// The following code is meant to be executed when the DOM is ready.
document.addEventListener("DOMContentLoaded", (e) => {
  console.info("DOM ready, doing stuff!");

  // Initialize the actual engine. This object will provide the actual logic of
  // the application.
  let engine = new ColorizerEngine();

  let io = new ColorizerInterface(engine);
});
