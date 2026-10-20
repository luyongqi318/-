import { getDb } from "./db";

export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
export const todayIso = () => iso(new Date());

function all<T = any>(sql: string, ...params: any[]): T[] {
  return getDb().prepare(sql).all(...params) as T[];
}
function one<T = any>(sql: string, ...params: any[]): T | undefined {
  return getDb().prepare(sql).get(...params) as T | undefined;
}

export type DepartmentRow = { id: number; name: string; head: string; target_headcount: number; color: string };

export function getDepartments(): DepartmentRow[] {
  return all<DepartmentRow>("SELECT * FROM departments ORDER BY id");
}

export type EmployeeRow = {
  id: number;
  emp_no: string;
  name: string;
  gender: string;
  phone: string;
  email: string | null;
  department_id: number;
  department: string;
  dept_color: string;
  position: string;
  level: string;
  hire_date: string;
  status: string;
  contract_end: string | null;
  salary: number | null;
  birth_date: string | null;
};

const EMPLOYEE_SELECT = `
  SELECT e.*, d.name AS department, d.color AS dept_color
  FROM employees e JOIN departments d ON d.id = e.department_id
`;

export function getEmployees(filters?: { q?: string; dept?: number; status?: string }): EmployeeRow[] {
  const where: string[] = [];
  const params: any[] = [];
  if (filters?.q) {
    where.push("(e.name LIKE ? OR e.emp_no LIKE ? OR e.position LIKE ?)");
    const kw = `%${filters.q}%`;
    params.push(kw, kw, kw);
  }
  if (filters?.dept) {
    where.push("e.department_id = ?");
    params.push(filters.dept);
  }
  if (filters?.status && filters.status !== "全部") {
    where.push("e.status = ?");
    params.push(filters.status);
  }
  const sql = `${EMPLOYEE_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY e.department_id, e.id`;
  return all<EmployeeRow>(sql, ...params);
}

export function getEmployee(id: number) {
  const employee = one<EmployeeRow>(`${EMPLOYEE_SELECT} WHERE e.id = ?`, id);
  if (!employee) return null;
  const enrollments = all(
    `SELECT en.*, c.title AS course, c.category, c.mandatory FROM enrollments en
     JOIN courses c ON c.id = en.course_id WHERE en.employee_id = ? ORDER BY en.due_date DESC`,
    id,
  );
  const reviews = all(`SELECT * FROM reviews WHERE employee_id = ? ORDER BY period DESC`, id);
  const shifts = all(`SELECT * FROM shifts WHERE employee_id = ? ORDER BY work_date DESC LIMIT 7`, id);
  const attendance = all(
    `SELECT status, COUNT(*) AS n FROM attendance WHERE employee_id = ? GROUP BY status`,
    id,
  ) as { status: string; n: number }[];
  return { employee, enrollments, reviews, shifts, attendance };
}

export function getEmployeeStats() {
  const head = one<{ n: number }>("SELECT COUNT(*) n FROM employees WHERE status != '离职'")!.n;
  const probation = one<{ n: number }>("SELECT COUNT(*) n FROM employees WHERE status = '试用期'")!.n;
  const monthStart = iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const newHires = one<{ n: number }>("SELECT COUNT(*) n FROM employees WHERE hire_date >= ?", monthStart)!.n;
  const expiring = one<{ n: number }>(
    "SELECT COUNT(*) n FROM employees WHERE status != '离职' AND contract_end IS NOT NULL AND contract_end BETWEEN ? AND ?",
    todayIso(),
    iso(addDays(new Date(), 30)),
  )!.n;
  return { head, probation, newHires, expiring };
}

export type JobRow = {
  id: number;
  title: string;
  department: string;
  department_id: number;
  headcount: number;
  filled: number;
  salary_min: number;
  salary_max: number;
  status: string;
  priority: string;
  owner: string;
  created_at: string;
  description: string;
  applicants: number;
  interviewing: number;
  days_open: number;
};

export function getJobs(): JobRow[] {
  return all<JobRow>(
    `SELECT j.*, d.name AS department,
       (SELECT COUNT(*) FROM candidates c WHERE c.job_id = j.id) AS applicants,
       (SELECT COUNT(*) FROM candidates c WHERE c.job_id = j.id AND c.stage = '面试中') AS interviewing,
       CAST(julianday(?) - julianday(j.created_at) AS INTEGER) AS days_open
     FROM jobs j JOIN departments d ON d.id = j.department_id
     ORDER BY CASE j.status WHEN '招聘中' THEN 0 ELSE 1 END, j.priority = '高' DESC, j.created_at DESC`,
    todayIso(),
  );
}

export type CandidateRow = {
  id: number;
  name: string;
  phone: string;
  source: string;
  stage: string;
  rating: number;
  applied_at: string;
  hired_at: string | null;
  note: string;
  job_id: number;
  job: string;
  department: string;
  days_in_stage: number;
};

export function getCandidates(): CandidateRow[] {
  return all<CandidateRow>(
    `SELECT c.*, j.title AS job, d.name AS department,
       CAST(julianday(?) - julianday(c.applied_at) AS INTEGER) AS days_in_stage
     FROM candidates c JOIN jobs j ON j.id = c.job_id JOIN departments d ON d.id = j.department_id
     ORDER BY c.applied_at DESC`,
    todayIso(),
  );
}

export function getUpcomingInterviews(limit = 8) {
  return all(
    `SELECT i.*, c.name AS candidate, j.title AS job
     FROM interviews i JOIN candidates c ON c.id = i.candidate_id JOIN jobs j ON j.id = c.job_id
     WHERE i.scheduled_at >= ? ORDER BY i.scheduled_at ASC LIMIT ?`,
    `${todayIso()} 00:00`,
    limit,
  );
}

export function getRecruitmentStats() {
  const openJobs = one<{ n: number; remaining: number }>(
    "SELECT COUNT(*) n, COALESCE(SUM(headcount - filled),0) remaining FROM jobs WHERE status = '招聘中'",
  )!;
  const candidates = one<{ n: number }>("SELECT COUNT(*) n FROM candidates")!.n;
  const active = one<{ n: number }>(
    "SELECT COUNT(*) n FROM candidates WHERE stage IN ('简历筛选','面试中','待发 offer')",
  )!.n;
  const weekStart = iso(startOfWeek(new Date()));
  const interviewsThisWeek = one<{ n: number }>(
    "SELECT COUNT(*) n FROM interviews WHERE scheduled_at >= ?",
    `${weekStart} 00:00`,
  )!.n;
  const tth = one<{ d: number | null }>(
    "SELECT AVG(julianday(hired_at) - julianday(applied_at)) d FROM candidates WHERE hired_at IS NOT NULL",
  )!;
  return {
    openJobs: openJobs.n,
    remaining: openJobs.remaining,
    candidates,
    active,
    interviewsThisWeek,
    avgTimeToHire: tth.d ? Math.round(tth.d) : 0,
  };
}

export function getHiringFunnel() {
  const rows = all<{ stage: string; n: number }>("SELECT stage, COUNT(*) n FROM candidates GROUP BY stage");
  const order = ["新投递", "简历筛选", "面试中", "待发 offer", "已入职"];
  const map = Object.fromEntries(rows.map((r) => [r.stage, r.n]));
  return order.map((stage) => ({ stage, value: map[stage] ?? 0 }));
}

export function getTraining() {
  const courses = all(
    `SELECT c.*,
       (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrolled,
       (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = '已完成') AS completed
     FROM courses c ORDER BY c.mandatory DESC, c.id`,
  );
  const enrollments = all(
    `SELECT en.*, e.name AS employee, d.name AS department, c.title AS course, c.category
     FROM enrollments en
     JOIN employees e ON e.id = en.employee_id
     JOIN departments d ON d.id = e.department_id
     JOIN courses c ON c.id = en.course_id
     WHERE e.status != '离职'
     ORDER BY CASE en.status WHEN '已逾期' THEN 0 WHEN '学习中' THEN 1 WHEN '未开始' THEN 2 ELSE 3 END, en.due_date ASC`,
  );
  const stats = one<{ total: number; done: number; overdue: number; learning: number }>(
    `SELECT COUNT(*) total,
       SUM(CASE WHEN status='已完成' THEN 1 ELSE 0 END) done,
       SUM(CASE WHEN status='已逾期' THEN 1 ELSE 0 END) overdue,
       SUM(CASE WHEN status='学习中' THEN 1 ELSE 0 END) learning
     FROM enrollments`,
  )!;
  return {
    courses,
    enrollments,
    stats: {
      courses: courses.length,
      total: Number(stats.total ?? 0),
      done: Number(stats.done ?? 0),
      overdue: Number(stats.overdue ?? 0),
      learning: Number(stats.learning ?? 0),
      rate: stats.total ? Math.round((Number(stats.done) / Number(stats.total)) * 100) : 0,
    },
  };
}

export function getScheduling(weekStartIso?: string, deptId?: number) {
  const start = weekStartIso ? new Date(`${weekStartIso}T00:00:00`) : startOfWeek(new Date());
  const days = Array.from({ length: 7 }, (_, i) => iso(addDays(start, i)));
  const deptFilter = deptId && deptId > 0 ? "AND e.department_id = ?" : "";
  const people = all(
    `SELECT e.id, e.name, e.position, d.name AS department, d.color AS dept_color
     FROM employees e JOIN departments d ON d.id = e.department_id
     WHERE e.status != '离职' ${deptFilter}
     ORDER BY e.department_id, e.id LIMIT 40`,
    ...(deptId && deptId > 0 ? [deptId] : []),
  ) as { id: number; name: string; position: string; department: string; dept_color: string }[];
  const ids = people.map((p) => p.id);
  const shifts = ids.length
    ? all(
        `SELECT employee_id, work_date, shift, start_time, end_time FROM shifts
         WHERE work_date BETWEEN ? AND ? AND employee_id IN (${ids.map(() => "?").join(",")})`,
        days[0],
        days[6],
        ...ids,
      )
    : [];
  const byKey = new Map<string, any>();
  shifts.forEach((s: any) => byKey.set(`${s.employee_id}:${s.work_date}`, s));

  const today = todayIso();
  const attendanceToday = all(
    `SELECT a.*, e.name AS employee, d.name AS department FROM attendance a
     JOIN employees e ON e.id = a.employee_id JOIN departments d ON d.id = e.department_id
     WHERE a.work_date = ? ORDER BY CASE a.status WHEN '缺勤' THEN 0 WHEN '迟到' THEN 1 WHEN '请假' THEN 2 ELSE 3 END LIMIT 40`,
    today,
  );
  const attStats = one<{ total: number; normal: number; late: number; absent: number; leave: number }>(
    `SELECT COUNT(*) total,
       SUM(CASE WHEN status='正常' THEN 1 ELSE 0 END) normal,
       SUM(CASE WHEN status='迟到' THEN 1 ELSE 0 END) late,
       SUM(CASE WHEN status='缺勤' THEN 1 ELSE 0 END) absent,
       SUM(CASE WHEN status='请假' THEN 1 ELSE 0 END) leave
     FROM attendance WHERE work_date = ?`,
    today,
  )!;

  return {
    start: days[0],
    days,
    people,
    shifts: byKey,
    attendanceToday,
    attStats: {
      total: Number(attStats.total ?? 0),
      normal: Number(attStats.normal ?? 0),
      late: Number(attStats.late ?? 0),
      absent: Number(attStats.absent ?? 0),
      leave: Number(attStats.leave ?? 0),
      rate: attStats.total ? Math.round((Number(attStats.normal) / Number(attStats.total)) * 1000) / 10 : 0,
    },
  };
}

export function getPerformance(period?: string) {
  const periods = all<{ period: string }>(
    "SELECT DISTINCT period FROM reviews ORDER BY period DESC",
  ).map((p) => p.period);
  const selected = (period && periods.includes(period) ? period : periods[0]) ?? "";
  const reviews = selected
    ? all(
        `SELECT r.*, e.name AS employee, e.position, d.name AS department, d.color AS dept_color
         FROM reviews r JOIN employees e ON e.id = r.employee_id JOIN departments d ON d.id = e.department_id
         WHERE r.period = ? ORDER BY r.score DESC`,
        selected,
      )
    : [];
  const dist = ["A", "B", "C", "D"].map((grade) => ({
    grade,
    value: reviews.filter((r: any) => r.grade === grade).length,
  }));
  const byDept = selected
    ? all(
        `SELECT d.name AS department,
           ROUND(AVG(r.score), 1) AS avg,
           COUNT(*) AS n,
           SUM(CASE WHEN r.score >= 80 THEN 1 ELSE 0 END) AS pass
         FROM reviews r
         JOIN employees e ON e.id = r.employee_id
         JOIN departments d ON d.id = e.department_id
         WHERE r.period = ?
         GROUP BY d.id ORDER BY avg DESC`,
        selected,
      )
    : [];
  const avg = reviews.length ? reviews.reduce((s: number, r: any) => s + r.score, 0) / reviews.length : 0;
  const pass = reviews.filter((r: any) => r.score >= 80).length;
  return {
    periods,
    selected,
    reviews,
    dist,
    byDept,
    stats: {
      total: reviews.length,
      avg: Math.round(avg * 10) / 10,
      passRate: reviews.length ? Math.round((pass / reviews.length) * 100) : 0,
      pending: reviews.filter((r: any) => r.status !== "已确认").length,
    },
  };
}

export function getDepartmentsWithCount() {
  return all<{ id: number; name: string; color: string; head: string; target_headcount: number; n: number }>(
    `SELECT d.id, d.name, d.color, d.head, d.target_headcount,
       COUNT(e.id) AS n
     FROM departments d LEFT JOIN employees e ON e.department_id = d.id AND e.status != '离职'
     GROUP BY d.id ORDER BY n DESC`,
  );
}

export function getHireTrend(months = 6) {
  const today = new Date();
  const buckets: { label: string; value: number }[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const n = one<{ n: number }>("SELECT COUNT(*) n FROM employees WHERE substr(hire_date,1,7) = ?", key)!.n;
    buckets.push({ label: `${d.getMonth() + 1}月`, value: n });
  }
  return buckets;
}

export function getCelebrations() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const birthdays = all(
    `SELECT e.name, e.birth_date, d.name AS department
     FROM employees e JOIN departments d ON d.id = e.department_id
     WHERE e.status != '离职' AND substr(e.birth_date, 6, 2) = ?
     ORDER BY substr(e.birth_date, 9, 2)`,
    month,
  ) as { name: string; birth_date: string; department: string }[];
  const anniversaries = all(
    `SELECT e.name, e.hire_date, d.name AS department,
       CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', e.hire_date) AS INTEGER) AS years
     FROM employees e JOIN departments d ON d.id = e.department_id
     WHERE e.status != '离职' AND substr(e.hire_date, 6, 2) = ?
       AND CAST(strftime('%Y', 'now') AS INTEGER) - CAST(strftime('%Y', e.hire_date) AS INTEGER) >= 1
     ORDER BY years DESC, substr(e.hire_date, 9, 2)`,
    month,
  ) as { name: string; hire_date: string; department: string; years: number }[];
  return { month: Number(month), birthdays, anniversaries };
}

export function getDashboard() {
  const headcount = one<{ n: number }>("SELECT COUNT(*) n FROM employees WHERE status != '离职'")!.n;
  const probation = one<{ n: number }>("SELECT COUNT(*) n FROM employees WHERE status = '试用期'")!.n;
  const monthStart = iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const newHires = one<{ n: number }>("SELECT COUNT(*) n FROM employees WHERE hire_date >= ?", monthStart)!.n;
  const resigned = one<{ n: number }>("SELECT COUNT(*) n FROM employees WHERE status = '离职'")!.n;
  const openJobs = one<{ n: number; remaining: number }>(
    "SELECT COUNT(*) n, COALESCE(SUM(headcount-filled),0) remaining FROM jobs WHERE status='招聘中'",
  )!;
  const training = one<{ total: number; done: number; overdue: number }>(
    `SELECT COUNT(*) total,
       SUM(CASE WHEN status='已完成' THEN 1 ELSE 0 END) done,
       SUM(CASE WHEN status='已逾期' THEN 1 ELSE 0 END) overdue
     FROM enrollments`,
  )!;
  const att = one<{ total: number; normal: number }>(
    "SELECT COUNT(*) total, SUM(CASE WHEN status='正常' THEN 1 ELSE 0 END) normal FROM attendance WHERE work_date = ?",
    todayIso(),
  )!;
  const periods = all<{ period: string }>("SELECT DISTINCT period FROM reviews ORDER BY period DESC");
  const latestPeriod = periods[0]?.period ?? "";
  const perf = one<{ total: number; avg: number; pass: number }>(
    `SELECT COUNT(*) total, AVG(score) avg, SUM(CASE WHEN score >= 80 THEN 1 ELSE 0 END) pass
     FROM reviews WHERE period = ?`,
    latestPeriod,
  )!;

  const enrollmentsTotal = Number(training.total ?? 0);
  const enrollmentsDone = Number(training.done ?? 0);
  const attTotal = Number(att.total ?? 0);
  const attNormal = Number(att.normal ?? 0);

  const deptRows = getDepartmentsWithCount();
  const funnel = getHiringFunnel();
  const trend = getHireTrend();
  const upcoming = getUpcomingInterviews(5);

  const expiringContracts = all(
    `SELECT e.id, e.name, e.position, d.name AS department, e.contract_end
     FROM employees e JOIN departments d ON d.id = e.department_id
     WHERE e.status != '离职' AND e.contract_end BETWEEN ? AND ?
     ORDER BY e.contract_end ASC LIMIT 5`,
    todayIso(),
    iso(addDays(new Date(), 30)),
  );
  const overdueTraining = all(
    `SELECT e.name AS employee, c.title AS course, en.due_date
     FROM enrollments en JOIN employees e ON e.id = en.employee_id JOIN courses c ON c.id = en.course_id
     WHERE en.status = '已逾期' ORDER BY en.due_date ASC LIMIT 5`,
  );
  const probationEnding = all(
    `SELECT e.id, e.name, e.position, d.name AS department, e.hire_date
     FROM employees e JOIN departments d ON d.id = e.department_id
     WHERE e.status = '试用期' ORDER BY e.hire_date ASC LIMIT 5`,
  );

  return {
    kpi: {
      headcount,
      probation,
      newHires,
      resigned,
      openJobs: openJobs.n,
      openings: Number(openJobs.remaining ?? 0),
      trainingRate: enrollmentsTotal ? Math.round((enrollmentsDone / enrollmentsTotal) * 100) : 0,
      trainingOverdue: Number(training.overdue ?? 0),
      attendanceRate: attTotal ? Math.round((attNormal / attTotal) * 1000) / 10 : 0,
      performanceAvg: Math.round(Number(perf.avg ?? 0) * 10) / 10,
      performancePass: perf.total ? Math.round((Number(perf.pass) / Number(perf.total)) * 100) : 0,
      performancePeriod: latestPeriod,
      turnover: headcount + resigned ? Math.round((resigned / (headcount + resigned)) * 1000) / 10 : 0,
    },
    departments: deptRows,
    funnel,
    trend,
    upcoming,
    todos: { expiringContracts, overdueTraining, probationEnding },
  };
}
