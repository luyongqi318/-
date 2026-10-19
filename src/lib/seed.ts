import type { DB } from "./db";

/** 确定性伪随机，保证每次初始化得到同一套演示数据。 */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

const SURNAMES = "王李张刘陈杨黄赵吴周徐孙马朱胡郭何高林罗郑梁谢宋唐许韩冯邓曹彭曾肖田董袁潘于蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛段雷侯龙史陶黎贺顾毛郝龚邵万钱严武戴莫孔向汤".split("");
const GIVEN = "伟芳娜敏静丽强磊军洋勇艳杰娟涛明超霞平刚文辉力鹏华红飞燕斌宁婷琳浩鑫晨宇欣悦佳慧倩雪峰岩帅珊晶丹萍健康乐天梦瑶嘉诚立新春海波光荣建国志秀兰淑芬桂".split("");
const GIVEN2 = ["", "", "", "华", "平", "明", "军", "丽", "强", "敏", "杰", "涛", "静", "伟", "芳", "磊"];

const DEPARTMENTS = [
  { name: "前厅部", head: "陈志远", target: 26, color: "#3f6f8f" },
  { name: "客房部", head: "王丽娟", target: 42, color: "#4f7f74" },
  { name: "餐饮部", head: "李国强", target: 30, color: "#a8763e" },
  { name: "厨房", head: "张伟民", target: 24, color: "#8a5a44" },
  { name: "销售部", head: "周敏", target: 12, color: "#6b5b8a" },
  { name: "人力资源部", head: "吴静", target: 6, color: "#4a6d63" },
  { name: "工程部", head: "赵建国", target: 9, color: "#5a6570" },
  { name: "保安部", head: "孙海涛", target: 8, color: "#8c4a4a" },
  { name: "财务部", head: "郑晓红", target: 6, color: "#6b6a4f" },
];

const POSITIONS: Record<string, string[]> = {
  前厅部: ["前台接待", "宾客关系主任", "礼宾员", "前厅主管", "值班经理"],
  客房部: ["客房服务员", "楼层主管", "布草管理员", "客房部经理助理"],
  餐饮部: ["餐厅服务员", "宴会服务员", "吧台调酒师", "餐饮主管"],
  厨房: ["中厨厨师", "西厨厨师", "点心师", "厨工", "厨师长"],
  销售部: ["销售经理", "会务协调员", "市场专员"],
  人力资源部: ["HR 专员", "招聘主管", "培训经理"],
  工程部: ["值班工程师", "空调技工", "电工"],
  保安部: ["保安员", "消防监控员", "保安主管"],
  财务部: ["会计", "出纳", "成本控制专员"],
};

const HEADCOUNT: Record<string, number> = {
  前厅部: 22,
  客房部: 34,
  餐饮部: 25,
  厨房: 19,
  销售部: 9,
  人力资源部: 5,
  工程部: 7,
  保安部: 6,
  财务部: 5,
};

const REVIEW_COMMENTS = [
  "服务意识强，宾客满意度稳定，建议在下季度承担带教任务。",
  "业务熟练，跨部门协作顺畅，可进一步培养为储备主管。",
  "工作认真，但高峰期应变速度需要提升，已安排专项带训。",
  "超额完成本季度 KPI，主动补位意识突出。",
  "细节把控到位，交接班记录规范，可作为标准示范。",
  "沟通耐心，投诉处理成功率高于部门平均。",
  "出勤稳定，技能达标，建议报名下一期管理提升课程。",
  "对新流程上手较快，独立值班能力已具备。",
];

const COURSES = [
  { title: "希尔顿品牌服务标准", category: "服务标准", duration: 90, mandatory: 1, desc: "品牌承诺、服务语言与宾客触点标准动作。" },
  { title: "新员工入职引导", category: "入职必修", duration: 60, mandatory: 1, desc: "酒店概况、组织架构、员工手册与合规红线。" },
  { title: "食品安全与卫生 HACCP", category: "安全合规", duration: 120, mandatory: 1, desc: "厨房与餐饮区域的食品安全关键控制点。" },
  { title: "消防与应急疏散", category: "安全合规", duration: 45, mandatory: 1, desc: "火警处置、疏散路线与应急预案演练。" },
  { title: "宾客投诉处理技巧", category: "服务标准", duration: 75, mandatory: 0, desc: "LEARN 模型与升级投诉的跨部门协同。" },
  { title: "收益管理与定价基础", category: "管理提升", duration: 150, mandatory: 0, desc: "客房收益指标、动态定价与渠道管理。" },
  { title: "客房清洁标准作业", category: "岗位技能", duration: 100, mandatory: 1, desc: "客房清洁流程、检查标准与布草管理。" },
  { title: "英文前台接待口语", category: "岗位技能", duration: 120, mandatory: 0, desc: "入住、退房、投诉场景的英文表达训练。" },
];

const JOBS = [
  { title: "前台接待", dept: "前厅部", headcount: 4, filled: 1, min: 6000, max: 7800, status: "招聘中", priority: "高", days: 18 },
  { title: "客房服务员", dept: "客房部", headcount: 8, filled: 3, min: 5500, max: 6800, status: "招聘中", priority: "高", days: 32 },
  { title: "餐厅服务员", dept: "餐饮部", headcount: 6, filled: 2, min: 5500, max: 7000, status: "招聘中", priority: "中", days: 12 },
  { title: "西厨厨师", dept: "厨房", headcount: 3, filled: 1, min: 7500, max: 9500, status: "招聘中", priority: "高", days: 25 },
  { title: "宴会销售经理", dept: "销售部", headcount: 1, filled: 0, min: 15000, max: 20000, status: "招聘中", priority: "高", days: 41 },
  { title: "值班工程师", dept: "工程部", headcount: 2, filled: 1, min: 9000, max: 12000, status: "招聘中", priority: "中", days: 15 },
  { title: "保安员", dept: "保安部", headcount: 3, filled: 1, min: 5500, max: 6500, status: "招聘中", priority: "低", days: 9 },
  { title: "成本控制专员", dept: "财务部", headcount: 1, filled: 0, min: 9000, max: 12000, status: "招聘中", priority: "中", days: 22 },
  { title: "培训经理", dept: "人力资源部", headcount: 1, filled: 0, min: 16000, max: 22000, status: "招聘中", priority: "高", days: 6 },
  { title: "礼宾员", dept: "前厅部", headcount: 2, filled: 2, min: 5800, max: 6800, status: "已关闭", priority: "低", days: 60 },
];

const SOURCES = ["BOSS 直聘", "内部推荐", "酒店官网", "校园招聘", "猎头", "58 同城"];

export function seedDatabase(db: DB) {
  const rand = mulberry32(20261019);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

  const today = new Date();
  const quarter = Math.floor(today.getMonth() / 3) + 1;
  const prevPeriod = `2026 Q${quarter === 1 ? 4 : quarter - 1}`;
  const prev2Period = `2026 Q${quarter === 2 ? 4 : quarter - 2 <= 0 ? quarter + 2 : quarter - 2}`;

  db.exec("BEGIN");
  try {
    const deptIds: Record<string, number> = {};
    const insDept = db.prepare("INSERT INTO departments (name, head, target_headcount, color) VALUES (?, ?, ?, ?)");
    DEPARTMENTS.forEach((d) => {
      const res = insDept.run(d.name, d.head, d.target, d.color);
      deptIds[d.name] = Number(res.lastInsertRowid);
    });

    // ---------------- 员工 ----------------
    const usedNames = new Set<string>();
    const makeName = () => {
      for (let i = 0; i < 80; i += 1) {
        const n = pick(SURNAMES) + pick(GIVEN) + pick(GIVEN2);
        if (!usedNames.has(n)) {
          usedNames.add(n);
          return n;
        }
      }
      return pick(SURNAMES) + pick(GIVEN) + String(usedNames.size);
    };

    const insEmp = db.prepare(
      `INSERT INTO employees (emp_no, name, gender, phone, email, department_id, position, level, hire_date, status, contract_end, salary, birth_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    type Emp = { id: number; name: string; dept: string; deptId: number; status: string; hireDate: string; level: string };
    const employees: Emp[] = [];
    let seq = 0;

    for (const dept of DEPARTMENTS) {
      const total = HEADCOUNT[dept.name];
      const positions = POSITIONS[dept.name];
      const supervisor = positions.find((p) => p.includes("主管")) ?? "值班主管";
      for (let i = 0; i < total; i += 1) {
        seq += 1;
        const name = makeName();
        const level = i === 0 ? "经理" : i <= 2 ? "主管" : "员工";
        const position =
          i === 0
            ? `${dept.name}经理`
            : i <= 2
              ? supervisor
              : positions[Math.floor((i / total) * positions.length) % positions.length];
        const gender = rand() > 0.45 ? "女" : "男";
        const daysAgo = i < 2 ? int(600, 2200) : rand() < 0.07 ? int(2, 25) : int(40, 2400);
        const hire = addDays(today, -daysAgo);
        let status = "在职";
        if (daysAgo < 90) status = "试用期";
        if (rand() < 0.03) status = "离职";
        const contractEnd =
          status === "离职"
            ? iso(addDays(today, -int(1, 60)))
            : rand() < 0.08
              ? iso(addDays(today, int(5, 28)))
              : iso(addDays(hire, 365 * 3));
        const salary =
          level === "经理" ? int(15000, 21000) : level === "主管" ? int(9000, 13000) : int(5500, 7800);
        const res = insEmp.run(
          `DJJ-${String(seq).padStart(4, "0")}`,
          name,
          gender,
          `1${int(30, 89)}${String(int(1000, 9999))}${String(int(1000, 9999))}`,
          `${seq}@doubletree-pudong.com`,
          deptIds[dept.name],
          position,
          level,
          iso(hire),
          status,
          contractEnd,
          salary,
          iso(addDays(today, -int(7200, 18000))),
        );
        employees.push({
          id: Number(res.lastInsertRowid),
          name,
          dept: dept.name,
          deptId: deptIds[dept.name],
          status,
          hireDate: iso(hire),
          level,
        });
      }
    }
    const active = employees.filter((e) => e.status !== "离职");

    // ---------------- 招聘 ----------------
    const insJob = db.prepare(
      `INSERT INTO jobs (title, department_id, headcount, filled, salary_min, salary_max, status, priority, owner, created_at, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const jobIds: { id: number; title: string; dept: string; status: string }[] = [];
    JOBS.forEach((j) => {
      const res = insJob.run(
        j.title,
        deptIds[j.dept],
        j.headcount,
        j.filled,
        j.min,
        j.max,
        j.status,
        j.priority,
        DEPARTMENTS.find((d) => d.name === j.dept)?.head ?? "人力资源部",
        iso(addDays(today, -j.days)),
        `${j.title}：负责${j.dept}日常运营标准执行，提供符合希尔顿品牌承诺的宾客体验。`,
      );
      jobIds.push({ id: Number(res.lastInsertRowid), title: j.title, dept: j.dept, status: j.status });
    });

    const insCand = db.prepare(
      `INSERT INTO candidates (job_id, name, phone, source, stage, rating, applied_at, hired_at, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const stagePlan = [
      ...Array(8).fill("新投递"),
      ...Array(7).fill("简历筛选"),
      ...Array(6).fill("面试中"),
      ...Array(3).fill("待发 offer"),
      ...Array(2).fill("已入职"),
      ...Array(3).fill("已淘汰"),
    ];
    const openJobs = jobIds.filter((j) => j.status === "招聘中");
    const candidateIds: { id: number; name: string; stage: string }[] = [];
    stagePlan.forEach((stage) => {
      const job = pick(openJobs);
      const name = makeName();
      const applied = addDays(today, -int(1, 38));
      const hired = stage === "已入职" ? iso(addDays(applied, int(8, 24))) : null;
      const res = insCand.run(
        job.id,
        name,
        `1${int(30, 89)}${String(int(1000, 9999))}${String(int(1000, 9999))}`,
        pick(SOURCES),
        stage,
        int(2, 5),
        iso(applied),
        hired,
        stage === "已淘汰" ? "岗位匹配度不足，进入人才库" : "",
      );
      candidateIds.push({ id: Number(res.lastInsertRowid), name, stage });
    });

    const insInterview = db.prepare(
      `INSERT INTO interviews (candidate_id, round, scheduled_at, interviewer, mode, result, feedback) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    candidateIds
      .filter((c) => c.stage === "面试中" || c.stage === "待发 offer")
      .forEach((c) => {
        const rounds = c.stage === "待发 offer" ? 2 : 1;
        for (let r = 1; r <= rounds; r += 1) {
          const when = addDays(today, r === rounds && c.stage === "面试中" ? int(0, 6) : -int(2, 12));
          insInterview.run(
            c.id,
            r,
            `${iso(when)} ${pick(["09:30", "10:30", "14:00", "15:30", "16:30"])}`,
            pick(["陈志远", "王丽娟", "李国强", "吴静", "周敏"]),
            pick(["现场", "视频", "电话"]),
            c.stage === "待发 offer" ? "通过" : pick(["通过", "待定"]),
            c.stage === "待发 offer" ? "沟通表达清晰，服务意识符合品牌要求，建议进入 offer 环节。" : "待补充上一段工作经历证明。",
          );
        }
      });

    // ---------------- 培训 ----------------
    const insCourse = db.prepare(
      "INSERT INTO courses (title, category, duration_min, mandatory, description) VALUES (?, ?, ?, ?, ?)",
    );
    const courseIds = COURSES.map((c) => Number(insCourse.run(c.title, c.category, c.duration, c.mandatory, c.desc).lastInsertRowid));

    const insEnroll = db.prepare(
      `INSERT INTO enrollments (employee_id, course_id, status, progress, score, assigned_at, due_date, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    active.forEach((emp) => {
      const count = int(2, 4);
      const picked = new Set<number>();
      while (picked.size < count) picked.add(courseIds[int(0, courseIds.length - 1)]);
      picked.forEach((cid) => {
        const r = rand();
        let status = "学习中";
        let progress = int(10, 85);
        let score: number | null = null;
        let completedAt: string | null = null;
        if (r < 0.55) {
          status = "已完成";
          progress = 100;
          score = int(78, 99);
          completedAt = iso(addDays(today, -int(1, 40)));
        } else if (r < 0.67) {
          status = "已逾期";
          progress = int(5, 60);
        } else if (r < 0.8) {
          status = "未开始";
          progress = 0;
        }
        const assigned = addDays(today, -int(5, 50));
        insEnroll.run(
          emp.id,
          cid,
          status,
          progress,
          score,
          iso(assigned),
          iso(addDays(assigned, int(10, 40))),
          completedAt,
        );
      });
    });

    // ---------------- 排班 & 考勤 ----------------
    const insShift = db.prepare(
      "INSERT INTO shifts (employee_id, work_date, shift, start_time, end_time) VALUES (?, ?, ?, ?, ?)",
    );
    const SHIFT_TIMES: Record<string, [string, string]> = {
      早班: ["07:00", "15:00"],
      中班: ["15:00", "23:00"],
      晚班: ["23:00", "07:00"],
      休息: ["", ""],
    };
    const monday = startOfWeek(today);
    const scheduled = active.slice(0, 90);
    scheduled.forEach((emp, idx) => {
      const pattern = idx % 5;
      for (let d = 0; d < 7; d += 1) {
        let shift = "休息";
        if (pattern === 0) shift = d % 6 === 5 ? "休息" : "早班";
        else if (pattern === 1) shift = d % 6 === 4 ? "休息" : "中班";
        else if (pattern === 2) shift = d % 5 === 3 ? "休息" : "晚班";
        else if (pattern === 3) shift = d % 2 === 0 ? "早班" : "中班";
        else shift = d === 6 ? "休息" : "早班";
        const [start, end] = SHIFT_TIMES[shift];
        insShift.run(emp.id, iso(addDays(monday, d)), shift, start, end);
      }
    });

    const insAtt = db.prepare(
      "INSERT INTO attendance (employee_id, work_date, clock_in, clock_out, status) VALUES (?, ?, ?, ?, ?)",
    );
    const attendDays = [0, -1, -2];
    attendDays.forEach((offset) => {
      const day = addDays(today, offset);
      scheduled.slice(0, 60).forEach((emp, idx) => {
        if (idx % 11 === 10) return;
        const shift = idx % 3 === 0 ? "早班" : idx % 3 === 1 ? "中班" : "晚班";
        const r = rand();
        let status = "正常";
        let inTime = shift === "早班" ? "06:52" : shift === "中班" ? "14:51" : "22:48";
        let outTime = shift === "早班" ? "15:05" : shift === "中班" ? "23:04" : "07:06";
        if (r < 0.05) {
          status = "迟到";
          inTime = shift === "早班" ? "07:12" : shift === "中班" ? "15:11" : "23:09";
        } else if (r < 0.08) {
          status = "请假";
          inTime = "";
          outTime = "";
        } else if (r < 0.1) {
          status = "缺勤";
          inTime = "";
          outTime = "";
        }
        insAtt.run(emp.id, iso(day), inTime, outTime, status);
      });
    });

    // ---------------- 绩效 ----------------
    const insReview = db.prepare(
      `INSERT INTO reviews (employee_id, period, score, grade, reviewer, comment, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );
    const heads = Object.fromEntries(DEPARTMENTS.map((d) => [d.name, d.head]));
    [prev2Period, prevPeriod].forEach((period) => {
      active.forEach((emp) => {
        if (rand() < 0.12) return;
        const score = Math.round((72 + rand() * 26) * 10) / 10;
        const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : "D";
        insReview.run(
          emp.id,
          period,
          score,
          grade,
          heads[emp.dept] ?? "吴静",
          pick(REVIEW_COMMENTS),
          rand() < 0.7 ? "已确认" : "待面谈",
        );
      });
    });

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
