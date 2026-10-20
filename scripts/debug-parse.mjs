import * as XLSX from "xlsx";
import fs from "node:fs";

function normalizeHeader(raw) {
  return String(raw ?? "")
    .replace(/\uFEFF/g, "")
    .replace(/\s+/g, "")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/[：:]/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
}

const wb = XLSX.read(fs.readFileSync("C:/Users/lu137/Desktop/Hotel name list-to oliver 的副本.xlsx"), { type: "buffer" });
const sheet = wb.Sheets["名单"];
const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }).map((row) => row.map((c) => String(c ?? "").trim()));
const clean = matrix.filter((row) => row.some((cell) => cell !== ""));
console.log("header row guess (row1):", JSON.stringify(clean[1]?.map(normalizeHeader)));
const headers = clean[1].map(normalizeHeader);
const row = clean[2];
const obj = {};
headers.forEach((h, i) => { if (h) obj[h] = row[i] ?? ""; });
console.log("row2 keys sample:", JSON.stringify(obj).slice(0, 500));
console.log("has e/name:", "e/name" in obj, obj["e/name"]);
