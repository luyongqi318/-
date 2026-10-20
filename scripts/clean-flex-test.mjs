import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/hr.db");
const before = Number(db.prepare("SELECT COUNT(*) n FROM employees").get().n);

db.prepare("DELETE FROM employees WHERE emp_no LIKE 'H90%' OR emp_no LIKE 'A90%' OR emp_no LIKE 'X90%'").run();
db.prepare("DELETE FROM departments WHERE name NOT IN (SELECT DISTINCT department_id FROM employees)").run();
db.prepare("DELETE FROM chat_messages").run();
db.prepare("DELETE FROM audit_log WHERE detail LIKE '%H90%' OR detail LIKE '%X90%'").run();

const after = Number(db.prepare("SELECT COUNT(*) n FROM employees").get().n);
const depts = Number(db.prepare("SELECT COUNT(*) n FROM departments").get().n);
const chats = Number(db.prepare("SELECT COUNT(*) n FROM chat_messages").get().n);
console.log(JSON.stringify({ before, after, depts, chats }));
db.close();
