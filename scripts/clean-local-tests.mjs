import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/hr.db");
db.prepare("DELETE FROM employees WHERE emp_no LIKE 'T0%'").run();
db.prepare("DELETE FROM departments WHERE id NOT IN (SELECT DISTINCT department_id FROM employees)").run();
db.prepare("DELETE FROM import_batches").run();
db.prepare("DELETE FROM chat_messages").run();
console.log(
  JSON.stringify({
    employees: Number(db.prepare("SELECT COUNT(*) n FROM employees").get().n),
    departments: Number(db.prepare("SELECT COUNT(*) n FROM departments").get().n),
    batches: Number(db.prepare("SELECT COUNT(*) n FROM import_batches").get().n),
    chats: Number(db.prepare("SELECT COUNT(*) n FROM chat_messages").get().n),
  }),
);
db.close();
