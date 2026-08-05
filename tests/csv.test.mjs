import test from "node:test";
import assert from "node:assert/strict";
import { labelsToCsv, parseCsv } from "../src/csv.js";

test("CSV import recognizes common address headers", () => {
  const labels = parseCsv("Full Name,Street Address,City,State,ZIP Code\nAlex Rivera,123 Splash Lane,Fort Worth,TX,76102");
  assert.equal(labels.length, 1);
  assert.equal(labels[0].name, "Alex Rivera");
  assert.equal(labels[0].address1, "123 Splash Lane");
  assert.equal(labels[0].postal, "76102");
});

test("CSV export quotes commas and round trips", () => {
  const csv = labelsToCsv([{ name: "Wiplash, AI", address1: "44 Signal Street", address2: "", city: "Austin", state: "TX", postal: "78701", country: "" }]);
  assert.match(csv, /"Wiplash, AI"/);
  assert.equal(parseCsv(csv)[0].name, "Wiplash, AI");
});

test("CSV import requires an address column", () => {
  assert.throws(() => parseCsv("Name,City\nJordan,Austin"), /address or street column/i);
});
