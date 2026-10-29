import { Download, FileSpreadsheet } from "lucide-react";
import { Badge, PageHeader } from "@/components/ui";
import { reportSummary } from "@/lib/reports";

export const dynamic = "force-dynamic";

const DESCRIPTIONS: Record<string, string> = {
  员工花名册: "全部员工的基础信息、部门、职位、入职与合同情况",
  招聘进展: "在招职位、需求与缺口、候选人数",
  候选人: "候选人当前所处阶段、来源与投递时间",
  培训完成: "每条学习任务的进度、状态与截止日期",
  绩效评估: "各周期绩效分数与等级",
  证照预警: "健康证等证照的到期日与剩余天数",
  审批记录: "请假、加班、调班等审批单与意见",
};

export default function ReportsPage() {
  const { sheets } = reportSummary();
  const total = sheets.reduce((sum, s) => sum + s.rows, 0);

  return (
    <>
      <PageHeader
        title="报表中心"
        desc={`一次导出 ${sheets.length} 张工作表，共 ${total} 行数据，可直接交给财务或总部`}
        eyebrow="DoubleTree · Reports"
        actions={
          <a className="btn btn-primary" href="/api/reports/excel">
            <Download size={15} /> 导出 Excel
          </a>
        }
      />

      <section className="card">
        <div className="card-head">
          <h2 className="card-title">
            <FileSpreadsheet /> 报表内容
          </h2>
          <span className="card-sub">单文件多工作表 · 自动带上当前数据</span>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>工作表</th>
                <th>内容</th>
                <th>行数</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((sheet) => (
                <tr key={sheet.name}>
                  <td className="cell-main">{sheet.name}</td>
                  <td className="cell-sub">{DESCRIPTIONS[sheet.name] ?? "—"}</td>
                  <td className="num">
                    <Badge tone={sheet.rows > 0 ? "green" : "gray"}>{sheet.rows} 行</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card card-pad" style={{ marginTop: 18 }}>
        <h2 className="card-title" style={{ marginBottom: 8 }}>
          怎么用
        </h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#424245", lineHeight: 2 }}>
          <li>点右上角「导出 Excel」，浏览器会直接下载一个 .xlsx 文件</li>
          <li>每张工作表独立，可直接筛选、透视，不需要再手工整理</li>
          <li>导出动作会写入审计日志，谁在什么时候导出了一目了然</li>
          <li>数据是实时生成的：导出前刚才做的修改会立刻体现在文件里</li>
        </ul>
      </section>
    </>
  );
}
