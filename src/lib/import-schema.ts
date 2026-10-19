import * as XLSX from "xlsx";
import { getDb } from "./db";
import { iso, todayIso } from "./queries";

export type ParsedTable = { headers: string[]; rows: Record<string, string>[] };

export type ImportError = { line: number; message: string };

export type ImportResult = {
  entity: string;
  label: string;
  total: number;
  inserted: number;
  skipped: number;
  errors: ImportError[];
  notes: string[];
};

const DEPT_PALETTE = ["#3f6f8f", "#4f7f74", "#a8763e", "#8a5a44", "#6b5b8a", "#4a6d63", "#5a6570", "#8c4a4a", "#6b6a4f"];

function decodeText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder("gbk").decode(bytes);
    } catch {
      return new TextDecoder("utf-8").decode(bytes);
    }
  }
}

function parseDelimited(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/)[0] ?? "";
  const delimiter = firstLine.includes("\t") && !firstLine.includes(",") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
}

export async function parseTable(file: File): Promise<ParsedTable> {
  const name = (file.name || "").toLowerCase();
  const buffer = await file.arrayBuffer();
  let matrix: string[][] = [];

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const wb = XLSX.read(buffer, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" });
    matrix = json.map((row) => (row as unknown[]).map((cell) => String(cell ?? "").trim()));
  } else {
    matrix = parseDelimited(decodeText(buffer)).map((row) => row.map((cell) => String(cell ?? "").trim()));
  }

  matrix = matrix.filter((row) => row.some((cell) => cell !== ""));
  if (matrix.length === 0) return { headers: [], rows: [] };

  const headers = matrix[0].map((h) => h.replace(/\s+/g, ""));
  const rows = matrix.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = row[idx] ?? "";
    });
    return obj;
  });
  return { headers, rows };
}

/* ------------------------------------------------------------------ */
/* 实体定义：表头、示例、字段别名                                        */
/* ------------------------------------------------------------------ */

export const ENTITIES = [
  {
    key: "employees",
    label: "员工花名册",
    desc: "一次导入在职、试用期员工；部门不存在会自动创建。",
    headers: ["工号", "姓名", "性别", "手机号", "邮箱", "部门", "职位", "级别", "入职日期", "状态", "合同到期", "月薪"],
    sample: [
      ["DJJ-9001", "张示例", "女", "13800000001", "demo1@doubletree-pudong.com", "前厅部", "前台接待", "员工", "2026-09-01", "在职", "2029-09-01", "6800"],
      ["", "李示例", "男", "13800000002", "", "客房部", "客房服务员", "员工", "2026-10-08", "试用期", "2029-10-08", "6200"],
    ],
  },
  {
    key: "jobs",
    label: "招聘职位",
    desc: "导入在招职位；部门不存在会自动创建，已招人数可留空。",
    headers: ["职位", "部门", "招聘人数", "已招", "薪资下限", "薪资上限", "优先级", "状态", "负责人", "发布日期", "职位描述"],
    sample: [
      ["礼宾员", "前厅部", "2", "0", "5800", "7000", "中", "招聘中", "陈志远", "2026-10-01", "负责行李、问询与接送机协调"],
    ],
  },
  {
    key: "candidates",
    label: "候选人",
    desc: "按职位名称关联到已存在职位；阶段不填默认「新投递」。",
    headers: ["姓名", "应聘职位", "手机号", "来源", "阶段", "评分", "投递日期", "备注"],
    sample: [
      ["王示例", "礼宾员", "13900000001", "BOSS 直聘", "面试中", "4", "2026-10-10", "有 2 年五星级酒店经验"],
    ],
  },
  {
    key: "courses",
    label: "培训课程",
    desc: "课程目录，同名课程会自动跳过。",
    headers: ["课程名称", "分类", "时长(分钟)", "是否必修", "简介"],
    sample: [
      ["礼宾服务标准", "服务标准", "60", "是", "行李服务、接送机与宾客问询标准动作"],
    ],
  },
  {
    key: "enrollments",
    label: "培训任务",
    desc: "给员工分配课程；员工用「工号」或「姓名」匹配，课程用「课程名称」匹配。",
    headers: ["员工工号", "员工姓名", "课程名称", "状态", "进度", "分配日期", "截止日期", "成绩"],
    sample: [
      ["DJJ-9001", "", "礼宾服务标准", "未开始", "0", "2026-10-15", "2026-11-05", ""],
      ["", "李示例", "消防与应急疏散", "学习中", "40", "2026-10-15", "2026-11-05", ""],
    ],
  },
] as const;

const STATUS_EMPLOYEE = ["在职", "试用期", "离职"];
const STATUS_JOB = ["招聘中", "已暂停", "已关闭"];
const STAGES = ["新投递", "简历筛选", "面试中", "待发 offer", "已入职", "已淘汰"];
const ENROLL_STATUS = ["未开始", "学习中", "已完成", "已逾期"];
const LEVELS = ["员工", "主管", "经理", "总监"];

function normalizeDate(raw: string, fallback = todayIso()): string {
  const value = String(raw ?? "").trim();
  if (!value) return fallback;
  const cleaned = value.replace(/[年月]/g, "-").replace(/[日]/g, "").replace(/[./]/g, "-");
  const match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return "";
  const [, y, m, d] = match;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function toInt(raw: string, fallback = 0): number {
  const n = Number(String(raw ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function ensureDepartment(db: any, name: string): number {
  const trimmed = name.trim();
  const existing = db.prepare("SELECT id FROM departments WHERE name = ?").get(trimmed) as { id: number } | undefined;
  if (existing) return existing.id;
  const count = (db.prepare("SELECT COUNT(*) AS n FROM departments").get() as { n: number }).n;
  const color = DEPT_PALETTE[Number(count) % DEPT_PALETTE.length];
  const res = db
    .prepare("INSERT INTO departments (name, head, target_headcount, color) VALUES (?, ?, ?, ?)")
    .run(trimmed, "待指定", 10, color);
  return Number(res.lastInsertRowid);
}

function nextEmpNo(db: any): string {
  const row = db.prepare("SELECT MAX(CAST(SUBSTR(emp_no, 5) AS INTEGER)) AS n FROM employees WHERE emp_no LIKE 'DJJ-%'").get() as {
    n: number | null;
  };
  const next = Number(row?.n ?? 0) + 1;
  return `DJJ-${String(next).padStart(4, "0")}`;
}

/* ------------------------------------------------------------------ */
/* 各实体的导入实现                                                     */
/* ------------------------------------------------------------------ */

function importEmployees(db: any, rows: Record<string, string>[], result: ImportResult) {
  const insert = db.prepare(
    `INSERT INTO employees (emp_no, name, gender, phone, email, department_id, position, level, hire_date, status, contract_end, salary, birth_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  rows.forEach((row, index) => {
    const line = index + 2;
    const name = (row["姓名"] ?? "").trim();
    const dept = (row["部门"] ?? "").trim();
    if (!name || !dept) {
      result.errors.push({ line, message: "姓名和部门必填" });
      return;
    }
    const hireDate = normalizeDate(row["入职日期"] ?? "");
    if (!hireDate) {
      result.errors.push({ line, message: `入职日期格式不正确：${row["入职日期"]}` });
      return;
    }
    const status = STATUS_EMPLOYEE.includes((row["状态"] ?? "").trim()) ? (row["状态"] ?? "").trim() : "在职";
    const level = LEVELS.includes((row["级别"] ?? "").trim()) ? (row["级别"] ?? "").trim() : "员工";
    const empNo = (row["工号"] ?? "").trim() || nextEmpNo(db);
    if (db.prepare("SELECT id FROM employees WHERE emp_no = ?").get(empNo)) {
      result.skipped += 1;
      result.notes.push(`第 ${line} 行：工号 ${empNo} 已存在，已跳过`);
      return;
    }
    const deptId = ensureDepartment(db, dept);
    insert.run(
      empNo,
      name,
      (row["性别"] ?? "").trim() || "女",
      (row["手机号"] ?? "").trim(),
      (row["邮箱"] ?? "").trim(),
      deptId,
      (row["职位"] ?? "").trim() || "员工",
      level,
      hireDate,
      status,
      normalizeDate(row["合同到期"] ?? "", "") || null,
      toInt(row["月薪"] ?? "", 0) || null,
      null,
    );
    result.inserted += 1;
  });
}

function importJobs(db: any, rows: Record<string, string>[], result: ImportResult) {
  const insert = db.prepare(
    `INSERT INTO jobs (title, department_id, headcount, filled, salary_min, salary_max, status, priority, owner, created_at, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  rows.forEach((row, index) => {
    const line = index + 2;
    const title = (row["职位"] ?? row["岗位"] ?? "").trim();
    const dept = (row["部门"] ?? "").trim();
    if (!title || !dept) {
      result.errors.push({ line, message: "职位和部门必填" });
      return;
    }
    const status = STATUS_JOB.includes((row["状态"] ?? "").trim()) ? (row["状态"] ?? "").trim() : "招聘中";
    const priority = ["高", "中", "低"].includes((row["优先级"] ?? "").trim()) ? (row["优先级"] ?? "").trim() : "中";
    const created = normalizeDate(row["发布日期"] ?? "");
    insert.run(
      title,
      ensureDepartment(db, dept),
      toInt(row["招聘人数"] ?? "", 1) || 1,
      toInt(row["已招"] ?? "", 0),
      toInt(row["薪资下限"] ?? "", 0) || null,
      toInt(row["薪资上限"] ?? "", 0) || null,
      status,
      priority,
      (row["负责人"] ?? "").trim(),
      created || todayIso(),
      (row["职位描述"] ?? "").trim(),
    );
    result.inserted += 1;
  });
}

function importCandidates(db: any, rows: Record<string, string>[], result: ImportResult) {
  const insert = db.prepare(
    `INSERT INTO candidates (job_id, name, phone, source, stage, rating, applied_at, hired_at, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  rows.forEach((row, index) => {
    const line = index + 2;
    const name = (row["姓名"] ?? "").trim();
    const jobTitle = (row["应聘职位"] ?? row["职位"] ?? "").trim();
    if (!name || !jobTitle) {
      result.errors.push({ line, message: "姓名和应聘职位必填" });
      return;
    }
    const job = db.prepare("SELECT id FROM jobs WHERE title = ? ORDER BY id DESC LIMIT 1").get(jobTitle) as
      | { id: number }
      | undefined;
    if (!job) {
      result.errors.push({ line, message: `找不到职位「${jobTitle}」，请先导入职位` });
      return;
    }
    const stage = STAGES.includes((row["阶段"] ?? "").trim()) ? (row["阶段"] ?? "").trim() : "新投递";
    const applied = normalizeDate(row["投递日期"] ?? "");
    insert.run(
      job.id,
      name,
      (row["手机号"] ?? "").trim(),
      (row["来源"] ?? "").trim() || "其他",
      stage,
      Math.min(5, Math.max(1, toInt(row["评分"] ?? "", 3) || 3)),
      applied || todayIso(),
      stage === "已入职" ? todayIso() : null,
      (row["备注"] ?? "").trim(),
    );
    result.inserted += 1;
  });
}

function importCourses(db: any, rows: Record<string, string>[], result: ImportResult) {
  const insert = db.prepare(
    "INSERT INTO courses (title, category, duration_min, mandatory, description) VALUES (?, ?, ?, ?, ?)",
  );
  rows.forEach((row, index) => {
    const line = index + 2;
    const title = (row["课程名称"] ?? row["课程"] ?? "").trim();
    if (!title) {
      result.errors.push({ line, message: "课程名称必填" });
      return;
    }
    if (db.prepare("SELECT id FROM courses WHERE title = ?").get(title)) {
      result.skipped += 1;
      result.notes.push(`第 ${line} 行：课程「${title}」已存在，已跳过`);
      return;
    }
    const mandatoryRaw = (row["是否必修"] ?? "").trim();
    const mandatory = ["是", "必修", "1", "true", "Y", "y"].includes(mandatoryRaw) ? 1 : 0;
    insert.run(
      title,
      (row["分类"] ?? "").trim() || "岗位技能",
      toInt(row["时长(分钟)"] ?? row["时长"] ?? "", 60) || 60,
      mandatory,
      (row["简介"] ?? "").trim(),
    );
    result.inserted += 1;
  });
}

function importEnrollments(db: any, rows: Record<string, string>[], result: ImportResult) {
  const insert = db.prepare(
    `INSERT INTO enrollments (employee_id, course_id, status, progress, score, assigned_at, due_date, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  rows.forEach((row, index) => {
    const line = index + 2;
    const empNo = (row["员工工号"] ?? "").trim();
    const empName = (row["员工姓名"] ?? "").trim();
    const courseTitle = (row["课程名称"] ?? "").trim();
    if ((!empNo && !empName) || !courseTitle) {
      result.errors.push({ line, message: "员工工号（或姓名）与课程名称必填" });
      return;
    }
    const employee = empNo
      ? (db.prepare("SELECT id, status FROM employees WHERE emp_no = ?").get(empNo) as any)
      : (db.prepare("SELECT id, status FROM employees WHERE name = ? ORDER BY id DESC LIMIT 1").get(empName) as any);
    if (!employee) {
      result.errors.push({ line, message: `找不到员工「${empNo || empName}」` });
      return;
    }
    if (employee.status === "离职") {
      result.errors.push({ line, message: `员工「${empNo || empName}」已离职` });
      return;
    }
    const course = db.prepare("SELECT id FROM courses WHERE title = ?").get(courseTitle) as { id: number } | undefined;
    if (!course) {
      result.errors.push({ line, message: `找不到课程「${courseTitle}」` });
      return;
    }
    if (db.prepare("SELECT id FROM enrollments WHERE employee_id = ? AND course_id = ?").get(employee.id, course.id)) {
      result.skipped += 1;
      result.notes.push(`第 ${line} 行：该员工已有同一课程，已跳过`);
      return;
    }
    const status = ENROLL_STATUS.includes((row["状态"] ?? "").trim()) ? (row["状态"] ?? "").trim() : "未开始";
    const progress = Math.min(100, Math.max(0, toInt(row["进度"] ?? "", status === "已完成" ? 100 : 0)));
    const assigned = normalizeDate(row["分配日期"] ?? "");
    const due = normalizeDate(row["截止日期"] ?? "");
    insert.run(
      employee.id,
      course.id,
      status,
      progress,
      toInt(row["成绩"] ?? "", 0) || null,
      assigned || todayIso(),
      due || iso(new Date(Date.now() + 21 * 86400000)),
      status === "已完成" ? todayIso() : null,
    );
    result.inserted += 1;
  });
}

const IMPORTERS: Record<string, (db: any, rows: Record<string, string>[], result: ImportResult) => void> = {
  employees: importEmployees,
  jobs: importJobs,
  candidates: importCandidates,
  courses: importCourses,
  enrollments: importEnrollments,
};

export function getEntity(key: string) {
  return ENTITIES.find((e) => e.key === key);
}

export function importRows(entityKey: string, rows: Record<string, string>[]): ImportResult {
  const entity = getEntity(entityKey);
  if (!entity) throw new Error("未知的导入类型");
  const db = getDb();
  const result: ImportResult = {
    entity: entity.key,
    label: entity.label,
    total: rows.length,
    inserted: 0,
    skipped: 0,
    errors: [],
    notes: [],
  };
  db.exec("BEGIN");
  try {
    IMPORTERS[entity.key](db, rows, result);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
  result.errors = result.errors.slice(0, 20);
  result.notes = result.notes.slice(0, 10);
  return result;
}

export function templateCsv(entityKey: string): string {
  const entity = getEntity(entityKey);
  if (!entity) throw new Error("未知的导入类型");
  const lines = [entity.headers.join(","), ...entity.sample.map((row) => row.map((cell) => `"${cell}"`).join(","))];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
