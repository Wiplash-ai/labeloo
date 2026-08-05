const labels = [...document.querySelectorAll(".label-row")];
const sheet = document.getElementById("demoSheet");
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
function renderSheet() {
  sheet.replaceChildren();
  for (let i = 0; i < 30; i += 1) {
    const cell = document.createElement("div");
    cell.className = `sheet-cell${i === 0 ? " active" : ""}`;
    const address = i < labels.length
      ? [labels[i].dataset.name, labels[i].dataset.address, labels[i].dataset.city]
      : fictionalAddresses[i];
    address.forEach((text) => {
      const span = document.createElement("span");
      span.textContent = text;
      cell.append(span);
    });
    sheet.append(cell);
  }
}
labels.forEach((row) =>
  row.addEventListener("click", () => {
    labels.forEach((item) => item.classList.toggle("active", item === row));
    fields[0].value = row.dataset.name;
    fields[1].value = row.dataset.address;
    fields[2].value = row.dataset.city;
  }),
);
fields.forEach((field, index) =>
  field.addEventListener("input", () => {
    const active = document.querySelector(".label-row.active");
    active.dataset[["name", "address", "city"][index]] = field.value;
    active.querySelector("span").childNodes[index ? 1 : 0].textContent =
      field.value;
    renderSheet();
  }),
);
document.getElementById("demoPrint").addEventListener("click", () => {
  const toast = document.getElementById("demoToast");
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 1800);
});
renderSheet();
