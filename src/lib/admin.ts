import { getDb } from "./db";

export type Certificate = {
  id: number;
  employeeId: number;
  employee: string;
  department: string;
  type: string;
  number: string;
  issuedAt: string;
  expiresAt: string;
  note: string;
  daysLeft: number;
};

export function listCertificates(): Certificate[] {
  const rows = getDb()
    .prepare(
      `SELECT c.*, e.name AS employee, d.name AS department
       FROM certificates c
       JOIN employees e ON e.id = c.employee_id
       JOIN departments d ON d.id = e.department_id
       ORDER BY c.expires_at ASC`,
    )
    .all() as any[];
  const today = Date.now();
  return rows.map((row) => ({
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    employee: String(row.employee ?? ""),
    department: String(row.department ?? ""),
    type: String(row.type ?? ""),
    number: String(row.number ?? ""),
    issuedAt: String(row.issued_at ?? ""),
    expiresAt: String(row.expires_at ?? ""),
    note: String(row.note ?? ""),
    daysLeft: Math.ceil((new Date(`${row.expires_at}T00:00:00`).getTime() - today) / 86400000),
  }));
}

export function certificateStats() {
  const items = listCertificates();
  return {
    total: items.length,
    expired: items.filter((i) => i.daysLeft < 0).length,
    soon: items.filter((i) => i.daysLeft >= 0 && i.daysLeft <= 30).length,
  };
}

export type Dorm = {
  id: number;
  employeeId: number;
  employee: string;
  department: string;
  building: string;
  roomNo: string;
  bedNo: string;
  fee: number | null;
  checkIn: string;
  checkOut: string;
};

export function listDorms(): Dorm[] {
  const rows = getDb()
    .prepare(
      `SELECT d.*, e.name AS employee, dep.name AS department
       FROM dorm_assignments d
       JOIN employees e ON e.id = d.employee_id
       JOIN departments dep ON dep.id = e.department_id
       ORDER BY d.building, d.room_no, d.bed_no`,
    )
    .all() as any[];
  return rows.map((row) => ({
    id: Number(row.id),
    employeeId: Number(row.employee_id),
    employee: String(row.employee ?? ""),
    department: String(row.department ?? ""),
    building: String(row.building ?? ""),
    roomNo: String(row.room_no ?? ""),
    bedNo: String(row.bed_no ?? ""),
    fee: row.fee === null ? null : Number(row.fee),
    checkIn: String(row.check_in ?? ""),
    checkOut: String(row.check_out ?? ""),
  }));
}

export type AgencyWorker = {
  id: number;
  name: string;
  agency: string;
  role: string;
  dailyRate: number | null;
  startDate: string;
  endDate: string;
  status: string;
  phone: string;
};

export function listAgency(): AgencyWorker[] {
  const rows = getDb().prepare("SELECT * FROM agency_workers ORDER BY id DESC").all() as any[];
  return rows.map((row) => ({
    id: Number(row.id),
    name: String(row.name ?? ""),
    agency: String(row.agency ?? ""),
    role: String(row.role ?? ""),
    dailyRate: row.daily_rate === null ? null : Number(row.daily_rate),
    startDate: String(row.start_date ?? ""),
    endDate: String(row.end_date ?? ""),
    status: String(row.status ?? ""),
    phone: String(row.phone ?? ""),
  }));
}
