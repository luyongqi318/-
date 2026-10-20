import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/hr.db");
db.prepare("DELETE FROM courses WHERE title IN ('服务意识基础','消防安全演练')").run();
db.prepare("DELETE FROM import_batches WHERE id = (SELECT MAX(id) FROM import_batches) AND inserted = 2 AND replaced = 0").run();
console.log("courses left:", db.prepare("SELECT COUNT(*) n FROM courses").get().n);
db.close();
if (fs.existsSync("data/test-courses.csv")) fs.unlinkSync("data/test-courses.csv");
