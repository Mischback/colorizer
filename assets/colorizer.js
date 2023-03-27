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

// Get DOM elements
const color_palette_list = document.querySelector("#color-palette ul");
const color_add_form = document.querySelector("#color-add form");
const color_add_input = document.querySelector("#new-color");


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
  updatePalette();
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
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}


function generatePaletteItem(color_id, color_hex) {
  // create the general list element
  const listItem = document.createElement("li");
  listItem.setAttribute("palette-color-id", color_id);

  // create a <span> to hold the color code as text
  const itemColorCode = document.createElement("span");
  itemColorCode.textContent = color_hex;

  // create an empty <div> to visualize the color
  const itemColorPreview = document.createElement("div");
  itemColorPreview.style.cssText = "background-color: #" + color_hex + ";";

  // create a <button> to delete the color from the palette
  const itemColorDelete = document.createElement("button");
  itemColorDelete.textContent = "delete";
  itemColorDelete.addEventListener("click", deleteColorFromPalette);

  listItem.appendChild(itemColorCode);
  listItem.appendChild(itemColorPreview);
  listItem.appendChild(itemColorDelete);

  return listItem;
}

function deleteColorFromPalette(e) {
  const color_id = Number(e.target.parentNode.getAttribute("palette-color-id"));

  const transaction = db.transaction(["colors"], "readwrite");
  const objectStore = transaction.objectStore("colors");
  const deleteRequest = objectStore.delete(color_id);

  transaction.addEventListener("complete", () => {
    e.target.parentNode.parentNode.removeChild(e.target.parentNode);
    console.log("Color deleted");

    // TODO: Trigger function to display the palette!
    updatePalette();
  });
}

function updatePalette() {
  // empty the existing palette to prevent duplicates
  while (color_palette_list.firstChild) {
    color_palette_list.removeChild(color_palette_list.firstChild);
  }

  const objectStore = db.transaction("colors").objectStore("colors");
  objectStore.openCursor().addEventListener("success", (e) => {
    const cursor = e.target.result;

    if (cursor) {
      color_palette_list.appendChild(generatePaletteItem(cursor.value.id, cursor.value.color_hex));

      // iterate to the next item
      cursor.continue();
    }
  });
}

// Hook into the DOM
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
    updatePalette();
  });

  transaction.addEventListener("error", () => {
    console.error("Transaction not opened due to error");
  });
});

/**** **** **** **** **** **** **** **** **** **** **** **** **** **** **** ***/
