/* This is the actual engine that powers the web-based colorscheme builder.
 *
 * It stores colors of a palette in the browser, using IndexedDB.
 *
 * The colors of the palette are displayed in a matrix/grid and evaluated
 * considering their contrast values.
 *
 * Resources:
 * ----------
 * - https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Client-side_web_APIs/Client-side_storage#storing_complex_data_%E2%80%94_indexeddb
 */

// The database object
let db;

// open an existing database or create a new one
//
// FIXME: Probably this should be wrapped in a function to make the site more
//        responsive, applying progressive enhancement methods
const openRequest = window.indexedDB.open("color_palette", 1);

/** Error handler */
openRequest.addEventListener("error", () => {
  console.error("Could not open database");
});

/** The database was successfully opened, now process the content. */
openRequest.addEventListener("success", () => {
  console.log("Database opened successfully");

  // store the handle to the database
  db = openRequest.result;

  // TODO: Trigger function to display the palette!
});

/** Initialize the desired database structure. */
openRequest.addEventListener("upgradeneeded", (e) => {
  db = e.target.result;

  // setup the objectStore
  const objectStore = db.createObjectStore("colorizer_palette", {
    keyPath: "id",
    autoIncrement: true,
  });

  objectStore.createIndex("color_hex", "color_hex", { unique: false });

  console.log("Database setup completed");
});
/**** **** **** **** **** **** **** **** **** **** **** **** **** **** **** ***/
