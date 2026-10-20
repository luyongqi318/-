import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/hr.db");
const q = (sql) => db.prepare(sql).get();
console.log("employees", q("SELECT COUNT(*) n FROM employees").n);
console.log("with english", q("SELECT COUNT(*) n FROM employees WHERE english_name IS NOT NULL AND english_name != ''").n);
console.log("sample", db.prepare("SELECT emp_no,name,english_name,position FROM employees ORDER BY id LIMIT 3").all());
const batch = db.prepare("SELECT id,inserted,skipped,errors_json FROM import_batches ORDER BY id DESC LIMIT 1").get();
console.log("batch", batch.id, "inserted", batch.inserted, "skipped", batch.skipped);
console.log("errors", String(batch.errors_json).slice(0, 400));
db.close();
