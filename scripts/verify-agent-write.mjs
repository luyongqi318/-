import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/hr.db");
console.log("employee:", db.prepare("SELECT name, emp_no, phone FROM employees WHERE name = '邱倩如'").get());
console.log("audit:", db.prepare("SELECT action, detail, actor FROM audit_log ORDER BY id DESC LIMIT 3").all());
// 还原测试值
db.prepare("UPDATE employees SET phone = '' WHERE name = '邱倩如' AND phone = '13800001111'").run();
console.log("reverted:", db.prepare("SELECT phone FROM employees WHERE name = '邱倩如'").get());
db.close();
