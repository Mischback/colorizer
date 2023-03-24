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
const openRequest = window.indexedDB.open("colorizer_palette", 1);

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
  const objectStore = db.createObjectStore("colors", {
    keyPath: "id",
    autoIncrement: true,
  });

  objectStore.createIndex("color_hex", "color_hex", { unique: true });
  objectStore.createIndex("color_r", "color_r", { unique: false });
  objectStore.createIndex("color_g", "color_g", { unique: false });
  objectStore.createIndex("color_b", "color_b", { unique: false });

  console.log("Database setup completed");
});

function hexToRGB(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

// Hook into the DOM
const color_add_form = document.querySelector("#color-add form");
const color_add_input = document.querySelector("#new-color");

color_add_form.addEventListener("submit", (e) => {
  // don't actually submit the form, intercept with this code
  e.preventDefault();

  let color = hexToRGB(color_add_input.value);

  if (color === null)
    // leave the function if the input can not be parsed as hex color code
    return;

  const new_item = { color_hex: color_add_input.value, color_r: color[0], color_g: color[1], color_b: color[2] };

  const transaction = db.transaction(["colors"], "readwrite");
  const objectStore = transaction.objectStore("colors");
  const addRequest = objectStore.add(new_item);

  addRequest.addEventListener("success", () => {
    // clear the form's field
    color_add_input.value = "";
  });

  transaction.addEventListener("complete", () => {
    console.log("Transaction completed, database modification finished");

    // TODO: Trigger function to display the palette!
  });

  transaction.addEventListener("error", () => {
    console.error("Transaction not opened due to error");
  });
});

/**** **** **** **** **** **** **** **** **** **** **** **** **** **** **** ***/
