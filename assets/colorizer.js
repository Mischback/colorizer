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

var color_palette_list = [];

// Get DOM elements
const DOM_color_palette_list = document.querySelector("#color-palette ul");
const DOM_color_add_form = document.querySelector("#color-add form");
const DOM_color_add_input = document.querySelector("#new-color");
const DOM_contrast_grid = document.querySelector("#contrast-grid");


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


function w3Category(contrastValue) {
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
}


function luminance(r, g, b) {
  var a = [r, g, b].map(function(v) {
    v /= 255;
    return v <= 0.03928
      ? v / 12.92
      : Math.pow((v+0.055) / 1.055, 2,4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}


function contrast(rgb1, rgb2) {
  var lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
  var lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
  var brighter = Math.max(lum1, lum2);
  var darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}


function buildContrastGrid(colorList, container) {
  /* Takes a list of hex colors (provided as strings) and builds a grid of
   * boxes with their respective contrast values.
   */

  let grid_row;
  let this_container;
  let this_container_content;
  let container_text;

  // empty the existing palette to prevent duplicates
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  for (let i=0; i<colorList.length; i++) {
    console.log("Color: " + color_palette_list[i]);

    grid_row = document.createElement("div");
    grid_row.classList.add("grid-row");

    for (var j=0; j<colorList.length; j++) {

      console.log("Color: " + colorList[i]);

      this_container = document.createElement("div");
      this_container.classList.add("grid-element");
      this_container.style.cssText = "background-color: #" + colorList[i] + "; color: #" + colorList[j] + ";";

      this_contrast = contrast(hexToRGB(colorList[i]), hexToRGB(colorList[j]))

      this_container_content = document.createElement("div");
      this_container_content.classList.add("w3cat");
      container_text = document.createTextNode(w3Category(this_contrast));
      this_container_content.appendChild(container_text);
      this_container.appendChild(this_container_content);

      this_container_content = document.createElement("div");
      this_container_content.classList.add("contrast-value");
      container_text = document.createTextNode(this_contrast.toFixed(2));
      this_container_content.appendChild(container_text);
      this_container.appendChild(this_container_content);

      this_container_content = document.createElement("div");
      this_container_content.classList.add("color-value");
      container_text = document.createTextNode(colorList[j]);
      this_container_content.appendChild(container_text);
      this_container.appendChild(this_container_content);

      grid_row.appendChild(this_container);
    }

    container.appendChild(grid_row);
  }
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
  while (DOM_color_palette_list.firstChild) {
    DOM_color_palette_list.removeChild(DOM_color_palette_list.firstChild);
  }
  color_palette_list = [];

  const transaction = db.transaction("colors");
  transaction.addEventListener("complete", () => {
    buildContrastGrid(color_palette_list, DOM_contrast_grid);
  });

  const objectStore = transaction.objectStore("colors");
  objectStore.openCursor().addEventListener("success", (e) => {
    const cursor = e.target.result;

    if (cursor) {
      DOM_color_palette_list.appendChild(generatePaletteItem(cursor.value.id, cursor.value.color_hex));
      color_palette_list.push(cursor.value.color_hex);

      // iterate to the next item
      cursor.continue();
    }
  });
}

// Hook into the DOM
DOM_color_add_form.addEventListener("submit", (e) => {
  // don't actually submit the form, intercept with this code
  e.preventDefault();

  let color = hexToRGB(DOM_color_add_input.value);

  if (color === null)
    // leave the function if the input can not be parsed as hex color code
    return;

  const new_item = { color_hex: DOM_color_add_input.value, color_r: color[0], color_g: color[1], color_b: color[2] };

  const transaction = db.transaction(["colors"], "readwrite");
  const objectStore = transaction.objectStore("colors");
  const addRequest = objectStore.add(new_item);

  addRequest.addEventListener("success", () => {
    // clear the form's field
    DOM_color_add_input.value = "";
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
