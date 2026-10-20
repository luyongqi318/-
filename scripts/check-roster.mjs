import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/hr.db");
console.log("employees", db.prepare("SELECT COUNT(*) n FROM employees").get().n);
console.log("with english", db.prepare("SELECT COUNT(*) n FROM employees WHERE english_name IS NOT NULL AND english_name != ''").get().n);
console.log("by dept", db.prepare("SELECT d.name dept, COUNT(*) n FROM employees e JOIN departments d ON d.id=e.department_id GROUP BY d.name ORDER BY n DESC").all());
const batch = db.prepare("SELECT id, inserted, replaced, errors_json FROM import_batches ORDER BY id DESC LIMIT 1").get();
console.log("batch", batch.id, "inserted", batch.inserted, "replaced", batch.replaced);
console.log("errors", db.prepare("SELECT json_array_length(errors_json) n FROM import_batches ORDER BY id DESC LIMIT 1").get().n);
db.close();
