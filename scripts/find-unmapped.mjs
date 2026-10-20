import * as XLSX from "xlsx";
import fs from "node:fs";

const MAP = {
  EO: "行政人事部", HR: "行政人事部", "S&M": "市场销售部", FIN: "财务部", ENG: "保障部",
  "ENG Budget": "保障部", "Property Department": "保障部", "F&B Office": "餐饮部", "Grand Cafe": "餐饮部",
  "Room Service": "餐饮部", "Lobby Lounge": "餐饮部", Banquet: "餐饮部", WK: "餐饮部", Pastry: "餐饮部",
  "CK Office": "餐饮部", "Processing Center": "餐饮部", "Cold Dish": "餐饮部", "Dim Sum": "餐饮部",
  "SH Kitchen": "餐饮部", Reservation: "房务部", "FO Budget": "房务部", Hhonors: "房务部", Operator: "房务部",
  Reception: "房务部", Concierge: "房务部", Transportation: "房务部", "Executive Floor": "房务部",
  "HSK Office": "房务部", PA: "房务部", Floor: "房务部", Laundry: "房务部", Linen: "房务部",
  "Fitness Center": "房务部", "房务部（物业）": "房务部（物业）",
};

const wb = XLSX.read(fs.readFileSync("C:/Users/lu137/Desktop/Hotel name list-to oliver 的副本.xlsx"), { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets["名单"], { header: 1, raw: false, defval: "" }).map((r) => r.map((c) => String(c).trim()));
const clean = rows.filter((r) => r.some((c) => c));
const header = clean[0];
const idx = Object.fromEntries(header.map((h, i) => [h, i]));
let lastCode = "";
const missing = [];
for (let i = 1; i < clean.length; i += 1) {
  const row = clean[i];
  const code = row[idx["Dept."]] || "";
  if (code) lastCode = code;
  const name = row[idx["C/Name"]] || "";
  const dept = row[idx["部门"]] || "";
  if (!name) continue;
  if (dept) continue;
  if (MAP[lastCode]) continue;
  missing.push({ line: i + 1, code: lastCode, name, position: row[idx["Position Chinese"]] });
}
console.log("unmapped rows:", missing.length);
console.log(JSON.stringify(missing.slice(0, 12)));
