import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("data/hr.db");
const count = () => ({
  employees: db.prepare("SELECT COUNT(*) n FROM employees").get().n,
  courses: db.prepare("SELECT COUNT(*) n FROM courses").get().n,
  jobs: db.prepare("SELECT COUNT(*) n FROM jobs").get().n,
  knowledge: db.prepare("SELECT COUNT(*) n FROM knowledge").get().n,
});
console.log("before:", JSON.stringify(count()));

db.prepare("DELETE FROM employees WHERE name LIKE '测试%' OR emp_no LIKE 'DJJ-99%'").run();
db.prepare("DELETE FROM jobs WHERE title LIKE '测试%'").run();
db.prepare("DELETE FROM courses WHERE title LIKE '测试%'").run();
db.prepare("DELETE FROM knowledge WHERE title LIKE '测试%' OR title = 'DB路径验证'").run();
db.prepare("DELETE FROM enrollments WHERE employee_id NOT IN (SELECT id FROM employees)").run();

console.log("after:", JSON.stringify(count()));
db.close();
