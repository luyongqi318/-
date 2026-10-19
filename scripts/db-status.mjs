import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync(process.env.HR_DB_PATH || "data/hr.db");
const one = (sql) => db.prepare(sql).get().n;
console.log(
  JSON.stringify(
    {
      employees: one("SELECT COUNT(*) n FROM employees"),
      active: one("SELECT COUNT(*) n FROM employees WHERE status != '离职'"),
      departments: one("SELECT COUNT(*) n FROM departments"),
      jobs: one("SELECT COUNT(*) n FROM jobs"),
      candidates: one("SELECT COUNT(*) n FROM candidates"),
      courses: one("SELECT COUNT(*) n FROM courses"),
      enrollments: one("SELECT COUNT(*) n FROM enrollments"),
      reviews: one("SELECT COUNT(*) n FROM reviews"),
      knowledge: one("SELECT COUNT(*) n FROM knowledge"),
    },
    null,
    1,
  ),
);
db.close();
