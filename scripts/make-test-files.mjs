import * as XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";

fs.mkdirSync("tmp", { recursive: true });

// 1) Excel：带标题行 + 空行 + 全角括号表头
const rows = [
  ["东锦江希尔顿逸林酒店 · 培训课程导入表"],
  [],
  ["课程名称", "分类", "时长（分钟）", "是否必修", "简介"],
  ["测试课程-Excel", "服务标准", "45", "是", "由 xlsx 导入的测试课程"],
  ["测试课程-Excel-2", "安全合规", "30", "否", "第二行测试"],
];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "课程");
XLSX.writeFile(wb, path.join("tmp", "courses.xlsx"));

// 2) 空表头 + 少列，验证错误提示
const bad = [["姓名", "部门"], ["只有姓名没部门", ""]];
const wb2 = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet(bad), "员工");
XLSX.writeFile(wb2, path.join("tmp", "bad.xlsx"));

console.log("files written");
