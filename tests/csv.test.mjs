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

test("CSV import supports name and email label types", () => {
  const [label] = parseCsv("Name,Email\nJordan,jordan@example.com");
  assert.equal(label.type, "email");
  assert.equal(label.email, "jordan@example.com");
});

test("CSV import requires at least one supported label column", () => {
  assert.throws(() => parseCsv("Favorite Color,Pet\nBlue,Fido"), /name, address, email, or label text column/i);
});
