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
   * @returns ``array`` with dedicated R, G and B values in range [0..255].
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
   * @param red Red component of the color in range [0..255].
   * @param green Green component of the color in range [0..255].
   * @param blue Blue component of the color in range [0..255].
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
   * @param sat Saturation of the color, given in range [0..100] (this allows
   *            *percent-based* input, but **you must not** include the percent
   *            sign!).
   * @param light Lightness of the color, given in range [0..100] (this allows
   *              *percent-based* input, but **you must not** include the
   *              percent sign!).
   * @returns ``array`` with dedicated R, G and B values in range [0..1].
   *
   * The implementation is directly fetched from
   * https://www.w3.org/TR/css-color-4/#hsl-to-rgb and returns the result R, G
   * and B values in range [0..1]. As ``ColorizerEngine`` expects the R, G and
   * B values in range [0..255], see ``hslToNormalizedRgb()`` for internal use.
   *
   * The normalization is not integrated into this function, because the
   * HWB-conversion functions require the original interface.
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

    return [f(0), f(8), f(4)];
  },

  /**
   * Convert a color in HSL notation to normalized RGB values.
   *
   * @param hue Hue of the color, given in *deg*. Internally normalized to a
   *            range of 360deg.
   * @param sat Saturation of the color, given in range [0..100] (this allows
   *            *percent-based* input, but **you must not** include the percent
   *            sign!).
   * @param light Lightness of the color, given in range [0..100] (this allows
   *              *percent-based* input, but **you must not** include the
   *              percent sign!).
   * @returns ``array`` with dedicated R, G and B values in range [0..255].
   *
   * This function applies normalization to the result of ``hslToRgb()``,
   * bringing the R, G and B values to a range of [0..255], using
   * ``normalizeRgb()``.
   */
  hslToNormalizedRgb: function(hue, sat, light) {
    let rgb = ColorizerUtility.hslToRgb(hue, sat, light)

    return [
      ColorizerUtility.normalizeRgb(rgb[0]),
      ColorizerUtility.normalizeRgb(rgb[1]),
      ColorizerUtility.normalizeRgb(rgb[2]),
    ];
  },

  /**
   * Convert a color in HWB notation to dedicated RGB values.
   *
   * @param hue Hue of the color, given in *deg*. Internally normalized to a
   *            range of 360deg.
   * @param white The amount of *white* to mix into the color, given in range
   *              [0..100] (this allows *percent-based* input, but **you must
   *              not** include the percent sign!).
   * @param black The amount of *black* to mix into the color, given in range
   *              [0..100] (this allows *percent-based* input, but **you must
   *              not** include the percent sign!).
   * @returns ``array`` with dedicated R, G and B values in range [0..1].
   *
   * The implementation is directly fetched from
   * https://www.w3.org/TR/css-color-4/#hwb-to-rgb and returns the result R, G
   * and B values in range [0..1]. As ``ColorizerEngine`` expects the R, G and
   * B values in range [0..255], see ``hwbToNormalizedRgb()`` for internal use.
   */
  hwbToRgb: function(hue, white, black) {
    white /= 100;
    black /= 100;

    if (white + black >= 1) {
      let grey = white / (white + black);
      return [grey, grey, grey];
    }

    let rgb = ColorizerUtility.hslToRgb(hue, 100, 50);
    for (let i = 0; i < 3; i++) {
      rgb[i] *= (1 - white - black);
      rgb[i] += white;
    }

    return [rgb[0], rgb[1], rgb[2]];
  },

  /**
   * Convert a color in HWB notation to normalized RGB values.
   *
   * @param hue Hue of the color, given in *deg*. Internally normalized to a
   *            range of 360deg.
   * @param white The amount of *white* to mix into the color, given in range
   *              [0..100] (this allows *percent-based* input, but **you must
   *              not** include the percent sign!).
   * @param black The amount of *black* to mix into the color, given in range
   *              [0..100] (this allows *percent-based* input, but **you must
   *              not** include the percent sign!).
   * @returns ``array`` with dedicated R, G and B values in range [0..255].
   *
   * This function applies normalization to the result of ``hwbToRgb()``,
   * bringing the R, G and B values to a range of [0..255], using
   * ``normalizeRgb()``.
   */
  hwbToNormalizedRgb: function(hue, white, black) {
    let rgb = ColorizerUtility.hwbToRgb(hue, white, black);

    return [
      ColorizerUtility.normalizeRgb(rgb[0]),
      ColorizerUtility.normalizeRgb(rgb[1]),
      ColorizerUtility.normalizeRgb(rgb[2]),
    ];
  },

  /**
   * Convert a color in RGB notation to HSL notation.
   *
   * @param red Red component of the color in range [0..255].
   * @param green Green component of the color in range [0..255].
   * @param blue Blue component of the color in range [0..255].
   * @returns ``array`` with values for hue, saturation and lightness where
   *          ``hue`` is given in degress in range [0..360] and ``saturation``
   *          and ``lightness`` are given as percentages in range [0..100].
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
   * Convert a color in RGB notation to HSL notation.
   *
   * @param red Red component of the color in range [0..255].
   * @param green Green component of the color in range [0..255].
   * @param blue Blue component of the color in range [0..255].
   * @returns ``array`` with values for hue, white and black where ``hue`` is
   *          given in degress in range [0..360] and ``white`` and ``black``
   *          are given as percentages in range [0..100].
   *
   * The implementation is based on
   * https://www.w3.org/TR/css-color-4/#rgb-to-hwb with only minimal
   * modifications to adjust the input of the function.
   *
   * Internally, this relies on ``rgbToHsl()`` to determine the ``hue``.
   */
  rgbToHwb: function(red, green, blue) {
    let hsl = ColorizerUtility.rgbToHsl(red, green, blue);

    // Normalization of the input parameters **after** calling ``rgbToHsl()``,
    // as that function applies its own normalization!
    red /= 255;
    green /= 255;
    blue /= 255;

    let white = Math.min(red, green, blue);
    let black = 1 - Math.max(red, green, blue);
    return [hsl[0], white * 100, black * 100];
  },

  rgbToOklch: function(red, green, blue) {
    // The actual functions are taken from here:
    // https://www.w3.org/TR/css-color-4/#color-conversion-code
    //
    // The overall method is described here:
    // https://www.w3.org/TR/css-color-4/#predefined-to-lab-oklab

    // 0. Provide the matching interface!
    red /= 255;
    green /= 255;
    blue /= 255;
    let rgb = [red, green, blue];
    // console.log(`Denormalized RGB array: ${rgb}`);

    // 1. Convert from gamma-encoded RGB to linear-light RGB
    rgb = rgb.map((val) => {
      let sign = val < 0 ? -1 : 1;
      let abs = Math.abs(val);

      if (abs < 0.04045)
        return val / 12.92;

      return sign * (Math.pow((abs + 0.055) / 1.055, 2.4));
    });
    // console.log(`Linear-light RGB array: ${rgb}`);

    // 2. Convert from linear RGB to CIE XYZ
    const mRgbToXyz = [
      [ 506752 / 1228815,  87881 / 245763,   12673 /   70218 ],
      [  87098 /  409605, 175762 / 245763,   12673 /  175545 ],
      [   7918 /  409605,  87881 / 737289, 1001167 / 1053270 ],
    ];
    let xyz = ColorizerUtility.multiplyMatrices(mRgbToXyz, rgb);
    // console.log(`XYZ: ${xyz}`);

    // 3. (Ensure D65 whitepoint) --> sRGB is already D65
    // 4. Convert from D65-adapted XYZ to Oklab
    const mXyzToLms = [
      [ 0.8190224432164319,    0.3619062562801221,   -0.12887378261216414  ],
      [ 0.0329836671980271,    0.9292868468965546,     0.03614466816999844 ],
      [ 0.048177199566046255,  0.26423952494422764,    0.6335478258136937  ]
    ];
    const mLmsToOklab = [
      [  0.2104542553,   0.7936177850,  -0.0040720468 ],
      [  1.9779984951,  -2.4285922050,   0.4505937099 ],
      [  0.0259040371,   0.7827717662,  -0.8086757660 ]
    ];
    let lms = ColorizerUtility.multiplyMatrices(mXyzToLms, xyz);
    let oklab = ColorizerUtility.multiplyMatrices(mLmsToOklab, lms.map(c => Math.cbrt(c)));
    // console.log(`Oklab: ${oklab}`);

    // 5. Convert from Oklab to Oklch
    let hue = Math.atan2(oklab[2], oklab[1]) * 180 / Math.PI;
    let chroma = Math.sqrt(oklab[1] ** 2 + oklab[2] ** 2);

    return [oklab[0] * 100, chroma * 100, hue];
  },

  /**
   * Normalize a value in range [0..1] to range [0..255].
   *
   * @param n The number to normalize, expected in range [0..1].
   * @returns ``Number`` in range [0..255].
   */
  normalizeRgb: function(n) {
    return Math.round(n * 255);
  },

  multiplyMatrices: function(A, B) {
    let m = A.length;

    if (!Array.isArray(A[0])) {
      // A is vector, convert to [[a, b, c, ...]]
      A = [A];
    }

    if (!Array.isArray(B[0])) {
      // B is vector, convert to [[a], [b], [c], ...]]
      B = B.map(x => [x]);
    }

    let p = B[0].length;
    let B_cols = B[0].map((_, i) => B.map(x => x[i])); // transpose B
    let product = A.map(row => B_cols.map(col => {
      if (!Array.isArray(row)) {
        return col.reduce((a, c) => a + c * row, 0);
      }

      return row.reduce((a, c, i) => a + c * (col[i] || 0), 0);
    }));

    if (m === 1) {
      product = product[0]; // Avoid [[a, b, c, ...]]
    }

    if (p === 1) {
      return product.map(x => x[0]); // Avoid [[a], [b], [c], ...]]
    }

    return product;
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
   * @returns The contrast ratio, a value between [1..21].
   *
   * The *common notation* of contrast values is something like ``6.1:1``. This
   * function would return ``6.1`` in that case.
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
  #inputDebounce;

  constructor(submitCallback=undefined) {
    // Fetch the #submitCallback or provide a generic one.
    if (submitCallback !== undefined) {
      this.#submitCallback = submitCallback;
    } else {
      this.#submitCallback = ((e) => {
        console.info(`Submitting form, #currentColor: (${this.#currentColor.r}, ${this.#currentColor.g}, ${this.#currentColor.b})`);
      });
    }
    this.#inputDebounce = 500;

    // Get the DOM elements of the <form>
    //
    // The form's elements are fetched by their ``id`` attribute, which is -
    // as of now - hardcoded here.
    //
    // Because this class can't work without these DOM elements, instances of
    // ``Error`` are thrown if one of the required elements can't be found.
    this.form = this.#getDomElementById("#color-add-form");

    this.inputPick = this.#getDomElementById("#new-color-pick");

    this.inputHex = this.#getDomElementById("#new-color-hex");
    // Attach a validation pattern to the hex-based input.
    this.inputHex.pattern = "#[0-9A-Fa-f]{6}";

    this.inputRgbR = this.#getDomElementById("#new-color-rgb-r");
    this.inputRgbG = this.#getDomElementById("#new-color-rgb-g");
    this.inputRgbB = this.#getDomElementById("#new-color-rgb-b");

    this.inputHslH = this.#getDomElementById("#new-color-hsl-h");
    this.inputHslS = this.#getDomElementById("#new-color-hsl-s");
    this.inputHslL = this.#getDomElementById("#new-color-hsl-l");

    this.inputHwbH = this.#getDomElementById("#new-color-hwb-h");
    this.inputHwbW = this.#getDomElementById("#new-color-hwb-w");
    this.inputHwbB = this.#getDomElementById("#new-color-hwb-b");

    this.inputOklchL = this.#getDomElementById("#new-color-oklch-l");
    this.inputOklchC = this.#getDomElementById("#new-color-oklch-c");
    this.inputOklchH = this.#getDomElementById("#new-color-oklch-h");

    // Attach event handlers to the DOM elements
    this.form.addEventListener("submit", (e) => {
      this.#submitCallback(e);
    });
    this.inputPick.addEventListener("change", this.#setColorFromInputPick.bind(this));
    this.inputHex.addEventListener("input", this.#debounce(this.#setColorFromInputHex.bind(this), this.#inputDebounce));
    this.inputRgbR.addEventListener("input", this.#debounce(this.#setColorFromInputRgb.bind(this), this.#inputDebounce));
    this.inputRgbG.addEventListener("input", this.#debounce(this.#setColorFromInputRgb.bind(this), this.#inputDebounce));
    this.inputRgbB.addEventListener("input", this.#debounce(this.#setColorFromInputRgb.bind(this), this.#inputDebounce));
    this.inputHslH.addEventListener("input", this.#debounce(this.#setColorFromInputHsl.bind(this), this.#inputDebounce));
    this.inputHslS.addEventListener("input", this.#debounce(this.#setColorFromInputHsl.bind(this), this.#inputDebounce));
    this.inputHslL.addEventListener("input", this.#debounce(this.#setColorFromInputHsl.bind(this), this.#inputDebounce));
    this.inputHwbH.addEventListener("input", this.#debounce(this.#setColorFromInputHwb.bind(this), this.#inputDebounce));
    this.inputHwbW.addEventListener("input", this.#debounce(this.#setColorFromInputHwb.bind(this), this.#inputDebounce));
    this.inputHwbB.addEventListener("input", this.#debounce(this.#setColorFromInputHwb.bind(this), this.#inputDebounce));

    // Initialize the list of Observers
    this.#currentColorObservers = [];

    this.registerColorObserver(this.#updateInputPick.bind(this));
    this.registerColorObserver(this.#updateInputHex.bind(this));
    this.registerColorObserver(this.#updateInputRgb.bind(this));
    this.registerColorObserver(this.#updateInputHsl.bind(this));
    this.registerColorObserver(this.#updateInputHwb.bind(this));
    this.registerColorObserver(this.#updateInputOklch.bind(this));

    // FIXME: This is only for development!
    this.registerColorObserver((c) => {
      console.debug(`[DEBUG] Color Change: (${c.r}, ${c.g}, ${c.b})`);
    });

    // Initialize the #currentColor attribute
    this.#setCurrentColor();
  }

  /**
   * Debounce an HTML form input.
   *
   * @param fn The actual event handler function.
   * @param d The desired debounce time.
   *
   * This class attaches event handlers to the various input fields, which will
   * modify the internal color value. As these ``input`` fields allow keyboard
   * input, a slight *debouncing* improves the user experience, as it allows
   * the users to complete typing the desired value, before updating the
   * color and thus executing further callbacks (e.g. the *Observers* to
   * ``currentColor``.
   */
  #debounce(fn, d) {
    let timer;
    return function() {
      clearTimeout(timer);
      timer = setTimeout(fn, d);
    }
  }

  /**
   * Get a DOM element by its ``id`` attribute.
   *
   * @param domId The DOM element's ``id`` attribute.
   * @returns A reference to the actual DOM element.
   *
   * This is an internal utility function to provide general error handling.
   * Please note that ``Error`` is not actually handled, because the absence of
   * a required DOM element is considered a non-recoverable error.
   */
  #getDomElementById(domId) {
    let tmp = document.querySelector(domId);
    if (tmp === null) {
      throw new Error(`Missing required DOM element with id '${domId}'`);
    }
    return tmp;
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
   * ``r``, ``g`` and ``b`` are internally normalized to range 0..255.
   *
   * This method is **private**.
   *
   * Part of the quick and dirty implementation of the Observer pattern. See
   * the class's attribute ``#currentColorObservers`` and the
   * ``registerColorObserver()`` method.
   */
  #setCurrentColor({r = 0, g = 0, b = 0, cause = ""} = {}) {
    this.#currentColor = { r: r % 256, g: g % 256, b: b % 256};

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
   * This method is attached as an EventHandler to the input field, see this
   * class's ``constructor()``.
   */
  #setColorFromInputPick() {
    let rgbColor = ColorizerUtility.hexToRgb(this.inputPick.value);
    this.#setCurrentColor({r: rgbColor[0], g: rgbColor[1], b: rgbColor[2]});
  }

  /**
   * Set ``#currentColor`` from the hex-based input field.
   *
   * This method is attached as an EventHandler to the input field, see this
   * class's ``constructor()``.
   */
  #setColorFromInputHex() {
    // Check validity to minimize updates **while** editing the value
    if (this.inputHex.validity.valid) {
      let rgbColor = ColorizerUtility.hexToRgb(this.inputHex.value);
      this.#setCurrentColor({r: rgbColor[0], g: rgbColor[1], b: rgbColor[2]});
    }
  }

  /**
   * Set ``#currentColor`` from the RGB input fields.
   *
   * This method is attached as an EventHandler to the RGB-related input
   * fields, see this class's ``constructor()``.
   */
  #setColorFromInputRgb() {
    this.#setCurrentColor({
      r: this.#getNormalizedNumberInput(this.inputRgbR, {max: 255}),
      g: this.#getNormalizedNumberInput(this.inputRgbG, {max: 255}),
      b: this.#getNormalizedNumberInput(this.inputRgbB, {max: 255}),
    });
  }

  /**
   * Set ``#currentColor`` from the HSL input fields.
   *
   * This method is attached as an EventHandler to the HSL-related input
   * fields, see this class's ``constructor()``.
   */
  #setColorFromInputHsl() {
    let hue = ColorizerUtility.twoDecimalPlaces(
      this.#getNormalizedNumberInput(this.inputHslH, {wrap: 360})
    );
    let sat = ColorizerUtility.twoDecimalPlaces(
      this.#getNormalizedNumberInput(this.inputHslS, {max: 100})
    );
    let light = ColorizerUtility.twoDecimalPlaces(
      this.#getNormalizedNumberInput(this.inputHslL, {max: 100})
    );

    let rgb = ColorizerUtility.hslToNormalizedRgb(hue, sat, light);

    this.#setCurrentColor({
      r: rgb[0],
      g: rgb[1],
      b: rgb[2],
      cause: "hsl"
    });
  }

  /**
   * Set ``#currentColor`` from the HWB input fields.
   *
   * This method is attached as an EventHandler to the HWB-related input
   * fields, see this class's ``constructor()``.
   */
  #setColorFromInputHwb() {
    let hue = ColorizerUtility.twoDecimalPlaces(
      this.#getNormalizedNumberInput(this.inputHwbH, {wrap: 360})
    );
    let white = ColorizerUtility.twoDecimalPlaces(
      this.#getNormalizedNumberInput(this.inputHwbW, {max: 100})
    );
    let black = ColorizerUtility.twoDecimalPlaces(
      this.#getNormalizedNumberInput(this.inputHwbB, {max: 100})
    );

    let rgb = ColorizerUtility.hwbToNormalizedRgb(hue, white, black);

    this.#setCurrentColor({
      r: rgb[0],
      g: rgb[1],
      b: rgb[2],
      cause: "hwb"
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

    let hue, sat, light;

    if (cause === "hsl") {
      // While processing inputs from HSL, just keep the input fields in the
      // accepted range.
      hue = ColorizerUtility.twoDecimalPlaces(
        this.#getNormalizedNumberInput(this.inputHslH, {wrap: 360})
      );
      sat = ColorizerUtility.twoDecimalPlaces(
        this.#getNormalizedNumberInput(this.inputHslS, {max: 100})
      );
      light = ColorizerUtility.twoDecimalPlaces(
        this.#getNormalizedNumberInput(this.inputHslL, {max: 100})
      );
    } else {
      // Other causes must be handled by RGB to HSL conversion...
      let hsl = ColorizerUtility.rgbToHsl(newColor.r, newColor.g, newColor.b);

      if (isNaN(hsl[0])) {
        hue = ColorizerUtility.twoDecimalPlaces(0);
      } else {
        hue = ColorizerUtility.twoDecimalPlaces(hsl[0]);
      }

      sat = ColorizerUtility.twoDecimalPlaces(hsl[1]);
      light = ColorizerUtility.twoDecimalPlaces(hsl[2]);

      // ... but if the cause was HWB input, synchronize the ``hue`` component
      if (cause === "hwb") {
        hue = ColorizerUtility.twoDecimalPlaces(
          this.#getNormalizedNumberInput(this.inputHwbH, {wrap: 360})
        );
      }
    }

    this.inputHslH.value = hue;
    this.inputHslS.value = sat;
    this.inputHslL.value = light;
  }

  /**
   * Update the HWB input fields.
   *
   * @param newColor The new color as provided by ``#currentColor``.
   * @param cause Which input did cause this update?
   *
   * This method is attached as an Observer to the class's ``#currentColor``
   * attribute.
   */
  #updateInputHwb(newColor, cause) {

    let hue, white, black;

    if (cause === "hwb") {
      // While processing inputs from HWB, just keep the input fields in the
      // accepted range.
      hue = ColorizerUtility.twoDecimalPlaces(
        this.#getNormalizedNumberInput(this.inputHwbH, {wrap: 360})
      );
      white = ColorizerUtility.twoDecimalPlaces(
        this.#getNormalizedNumberInput(this.inputHwbW, {max: 100})
      );
      black = ColorizerUtility.twoDecimalPlaces(
        this.#getNormalizedNumberInput(this.inputHwbB, {max: 100})
      );
    } else {
      // Other causes must be handled by RGB to HWB conversion...
      let hwb = ColorizerUtility.rgbToHwb(newColor.r, newColor.g, newColor.b);

      if (isNaN(hwb[0])) {
        hue = ColorizerUtility.twoDecimalPlaces(0);
      } else {
        hue = ColorizerUtility.twoDecimalPlaces(hwb[0]);
      }

      white = ColorizerUtility.twoDecimalPlaces(hwb[1]);
      black = ColorizerUtility.twoDecimalPlaces(hwb[2]);

      // ... but if the cause was HSL input, synchronize the ``hue`` component
      if (cause === "hsl") {
        hue = ColorizerUtility.twoDecimalPlaces(
          this.#getNormalizedNumberInput(this.inputHslH, {wrap: 360})
        );
      }
    }

    this.inputHwbH.value = hue;
    this.inputHwbW.value = white;
    this.inputHwbB.value = black;
  }

  #updateInputOklch(newColor, cause) {
    let oklch = ColorizerUtility.rgbToOklch(newColor.r, newColor.g, newColor.b);

    this.inputOklchL.value = ColorizerUtility.twoDecimalPlaces(oklch[0]);
    this.inputOklchC.value = ColorizerUtility.twoDecimalPlaces(oklch[1]);
    this.inputOklchH.value = ColorizerUtility.twoDecimalPlaces(oklch[2]);
  }

  /**
   * Get the value of an input and normalize it for the internal usage.
   *
   * @param input The reference to the input field.
   * @param max The allowed maximum value.
   * @param wrap The value to wrap the value (this is applying a modulo
   *             operation).
   * @returns ``Number``
   *
   * Please note: ``max`` and ``wrap`` are wrapped in an object literal, see
   * https://2ality.com/2011/11/keyword-parameters.html for reference.
   */
  #getNormalizedNumberInput(input, {max=undefined, wrap=undefined} = {}) {
    let val = Number(input.value);

    if (max !== undefined) {
      if (val > max) {
        return max;
      } else {
        return val;
      }
    }

    if (wrap !== undefined) {
      return val % wrap;
    }

    return val;
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
