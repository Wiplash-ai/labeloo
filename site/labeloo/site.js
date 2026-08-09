const labels = [...document.querySelectorAll(".label-row")];
const sheet = document.getElementById("demoSheet");
const templateSelect = document.getElementById("demoTemplate");
const templateMeta = document.getElementById("demoTemplateMeta");
const isLocalReview = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const fields = [
  document.getElementById("demoName"),
  document.getElementById("demoAddress"),
  document.getElementById("demoCity"),
];
const fictionalAddresses = [
  ["Marlow Finch", "11 Paper Plane Way", "Ink Harbor, ZZ 00001"],
  ["Beatrix Morrow", "22 Lantern Lane", "Copper Cove, ZZ 00002"],
  ["Theo Bellweather", "33 Postmark Place", "Parcel Point, ZZ 00003"],
  ["Nora Quill", "44 Envelope Row", "Letter Lake, ZZ 00004"],
  ["August Vale", "55 Fountain Pen Road", "Script Springs, ZZ 00005"],
  ["Cleo Bright", "66 Sticker Street", "Peelerton, ZZ 00006"],
  ["Felix Dovetail", "77 Cardstock Court", "Paper Pines, ZZ 00007"],
  ["Iris Marigold", "88 Ribbon Route", "Bow Borough, ZZ 00008"],
  ["Otis North", "99 Compass Crescent", "Maple Meridian, ZZ 00009"],
  ["Juniper Reed", "10 Stamp Garden", "Postage Park, ZZ 00010"],
  ["Silas Moon", "21 Crescent Crossing", "Moonbeam Mills, ZZ 00011"],
  ["Willa Hart", "32 Keepsake Key", "Memory Meadow, ZZ 00012"],
  ["Arlo Moss", "43 Fern Folder", "Mossy Margin, ZZ 00013"],
  ["Maeve Sterling", "54 Silver Staple", "Binder Bay, ZZ 00014"],
  ["Rowan Pike", "65 Arrow Avenue", "Pointer Plains, ZZ 00015"],
  ["Elodie Snow", "76 Flurry File", "Winter Widget, ZZ 00016"],
  ["Milo Thistle", "87 Garden Grid", "Thimble Town, ZZ 00017"],
  ["Vera Bloom", "98 Petal Packet", "Flora Fold, ZZ 00018"],
  ["Hugo Slate", "19 Chalkboard Chase", "Sketch Summit, ZZ 00019"],
  ["Lena Sparrow", "20 Feather Form", "Nest Notes, ZZ 00020"],
  ["Ezra Clock", "31 Minute Marker", "Second Station, ZZ 00021"],
  ["Ada Wren", "42 Bluebird Box", "Songbird Square, ZZ 00022"],
  ["Orson Lark", "53 Melody Mailway", "Harmony Hill, ZZ 00023"],
  ["Poppy Gale", "64 Windmill Wrap", "Breezy Bend, ZZ 00024"],
  ["Calder Fox", "75 Copper Clip", "Fastener Falls, ZZ 00025"],
  ["Della June", "86 Calendar Corner", "Summer Schedule, ZZ 00026"],
  ["Emmett Pine", "97 Evergreen Edge", "Needle Nook, ZZ 00027"],
  ["Tessa Lake", "18 Ripple Register", "Current Creek, ZZ 00028"],
  ["Basil Stone", "29 Granite Guide", "Pebble Place, ZZ 00029"],
  ["Faye Ember", "30 Candle Card", "Glow Grove, ZZ 00030"],
];

if (isLocalReview) {
  document.querySelectorAll("[data-api-path]").forEach((link) => {
    link.href = `http://127.0.0.1:8790/${link.dataset.apiPath}`;
  });
}

const templates = [
  { id: "avery-5160-30", label: "Avery 5160 · Address", compatibility: "5160 / 8160 / 5260", columns: 3, rows: 10, count: 30, width: 2.625, height: 1 },
  { id: "avery-5161-20", label: "Avery 5161 · Address", compatibility: "5161 / 8161 / 5261", columns: 2, rows: 10, count: 20, width: 4, height: 1 },
  { id: "avery-5162-14", label: "Avery 5162 · Address", compatibility: "5162 / 8162 / 5262", columns: 2, rows: 7, count: 14, width: 4, height: 1.333 },
  { id: "avery-5163-10", label: "Avery 5163 · Shipping", compatibility: "5163 / 8163 / 5263", columns: 2, rows: 5, count: 10, width: 4, height: 2 },
  { id: "avery-5164-6", label: "Avery 5164 · Shipping", compatibility: "5164 / 8164", columns: 2, rows: 3, count: 6, width: 4, height: 3.333 },
  { id: "avery-5167-80", label: "Avery 5167 · Return address", compatibility: "5167 / 8167", columns: 4, rows: 20, count: 80, width: 1.75, height: 0.5 },
  { id: "avery-5195-60", label: "Avery 5195 · Return address", compatibility: "5195 / 8195", columns: 4, rows: 15, count: 60, width: 1.75, height: 0.66 },
  { id: "avery-5168-4", label: "Avery 5168 · Shipping", compatibility: "5168 / 8168", columns: 2, rows: 2, count: 4, width: 3.5, height: 5 },
  { id: "avery-5126-2", label: "Avery 5126 · Half sheet", compatibility: "5126 / 8126", columns: 1, rows: 2, count: 2, width: 8.5, height: 5.5 },
  { id: "avery-5165-1", label: "Avery 5165 · Full sheet", compatibility: "5165 / 8165", columns: 1, rows: 1, count: 1, width: 8.5, height: 11 },
  { id: "avery-5395-8", label: "Avery 5395 · Name badge", compatibility: "5395 / 8395", columns: 2, rows: 4, count: 8, width: 3.375, height: 2.333 },
  { id: "avery-5390-8", label: "Avery 5390 · Name badge", compatibility: "5390 / 8390", columns: 2, rows: 4, count: 8, width: 3.5, height: 2.219 },
  { id: "avery-5392-6", label: "Avery 5392 · Name badge", compatibility: "5392 / 8392", columns: 2, rows: 3, count: 6, width: 4, height: 3 },
];

templates.forEach((template) => {
  const option = document.createElement("option");
  option.value = template.id;
  option.textContent = template.label;
  templateSelect.append(option);
});

function activeTemplate() {
  return templates.find((template) => template.id === templateSelect.value) || templates[0];
}

function renderSheet() {
  const template = activeTemplate();
  sheet.replaceChildren();
  sheet.style.setProperty("--demo-columns", template.columns);
  sheet.style.setProperty("--demo-rows", template.rows);
  sheet.dataset.density = template.count > 30 ? "compact" : template.count > 14 ? "dense" : "normal";
  templateMeta.textContent = `${template.count} label${template.count === 1 ? "" : "s"} · ${template.width} × ${template.height} in · ${template.compatibility}`;
  for (let i = 0; i < template.count; i += 1) {
    const cell = document.createElement("div");
    cell.className = `sheet-cell${i === 0 ? " active" : ""}`;
    const address = i < labels.length
      ? [labels[i].dataset.name, labels[i].dataset.address, labels[i].dataset.city]
      : fictionalAddresses[i % fictionalAddresses.length];
    address.forEach((text) => {
      const span = document.createElement("span");
      span.textContent = text;
      cell.append(span);
    });
    sheet.append(cell);
  }
}
templateSelect.addEventListener("change", renderSheet);
labels.forEach((row) =>
  row.addEventListener("click", () => {
    labels.forEach((item) => item.classList.toggle("active", item === row));
    fields[0].textContent = row.dataset.name;
    fields[1].textContent = row.dataset.address;
    fields[2].textContent = row.dataset.city;
  }),
);
fields.forEach((field, index) =>
  field.addEventListener("input", () => {
    const active = document.querySelector(".label-row.active");
    active.dataset[["name", "address", "city"][index]] = field.textContent;
    if (index === 0) active.querySelector("small").textContent = field.textContent;
    renderSheet();
  }),
);
fields.forEach((field) => field.addEventListener("keydown", (event) => {
  if (event.key === "Enter") event.preventDefault();
}));
document.getElementById("demoPrint").addEventListener("click", () => {
  const toast = document.getElementById("demoToast");
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 1800);
});
renderSheet();
