import fs from "node:fs/promises";

const sourcePath = "C:/Users/dmerceron/.codex/visualizations/2026/07/20/019f7d00-e38c-7ac1-8dc7-a6627bae5cd7/feature-rows.json";
const outputMarkdown = new URL("./r4-uploaded-features-plan.md", import.meta.url);
const outputHtml = new URL("./r4-uploaded-features-gantt.html", import.meta.url);
const allRows = JSON.parse(await fs.readFile(sourcePath, "utf8"));
const rows = allRows.filter(row => Number(row.priority) >= 25 && Number(row.priority) <= 49).sort((a, b) => Number(a.priority) - Number(b.priority));

if (rows.length !== 25) throw new Error(`Expected 25 R4 activities from priorities 25-49, found ${rows.length}.`);

const waves = [
  { name: "Wave 1 · Priorities 25–30", from: 25, to: 30, start: "2026-08-03" },
  { name: "Wave 2 · Priorities 31–36", from: 31, to: 36, start: "2026-08-17" },
  { name: "Wave 3 · Priorities 37–42", from: 37, to: 42, start: "2026-08-31" },
  { name: "Wave 4 · Priorities 43–49", from: 43, to: 49, start: "2026-09-14" }
];

function workingDayEnd(start, duration) {
  const date = new Date(`${start}T00:00:00Z`);
  let remaining = Math.max(1, duration) - 1;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (![0, 6].includes(date.getUTCDay())) remaining -= 1;
  }
  return date.toISOString().slice(0, 10);
}

function jiraDisplay(value) {
  const text = String(value || "").trim();
  return text.match(/\bFDAP-\d+\b/i)?.[0].toUpperCase() || text;
}

function mermaidText(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").replace(/:/g, " –").trim();
}

function html(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
}

const sections = waves.map(wave => ({
  name: wave.name,
  tasks: rows.filter(row => Number(row.priority) >= wave.from && Number(row.priority) <= wave.to).map(row => {
    const effortDays = Math.max(0, Number(row.points) || 0);
    const durationDays = Math.max(1, Math.round(effortDays || 1));
    const end = workingDayEnd(wave.start, durationDays);
    const taskId = `feature-r4-${row.id}`;
    return {
      name: String(row.name).trim(),
      jira: String(row.jira_id || "").trim(),
      taskId,
      startDate: wave.start,
      durationDays,
      effortDays,
      dates: [wave.start, end],
      modifiers: [],
      release: "R4",
      owners: [],
      dependencies: [],
      sourcePriority: Number(row.priority),
      sourceFeatureId: String(row.id),
      sourceWorkflow: String(row.workflow || ""),
      sourceDomains: String(row.domains || ""),
      metadata: `${taskId}, ${wave.start}, ${end}`,
      raw: `    ${mermaidText(row.name)} :${taskId}, ${wave.start}, ${durationDays}d`
    };
  })
}));

const mermaidLines = [
  "%%{init: {\"theme\":\"base\",\"gantt\":{\"barHeight\":24,\"barGap\":8,\"topPadding\":48,\"leftPadding\":300,\"fontSize\":12},\"themeVariables\":{\"fontFamily\":\"Inter, Segoe UI, Arial, sans-serif\",\"taskBkgColor\":\"#42aa24\",\"taskBorderColor\":\"#2a8115\",\"taskTextColor\":\"#ffffff\",\"taskTextOutsideColor\":\"#10284e\",\"sectionBkgColor\":\"#f6f9fc\",\"altSectionBkgColor\":\"#ffffff\",\"gridColor\":\"#d7e0eb\"}}}%%",
  "gantt",
  "    title R4 prioritised uploaded features · 03 Aug–30 Sep 2026",
  "    dateFormat YYYY-MM-DD",
  "    axisFormat %d %b",
  "    tickInterval 1week",
  "    excludes weekends",
  "    todayMarker off"
];
for (const section of sections) {
  mermaidLines.push("", `    section ${section.name}`);
  for (const task of section.tasks) mermaidLines.push(`    ${mermaidText(task.name)} :${task.taskId}, ${task.startDate}, ${task.durationDays}d`);
}
const mermaid = mermaidLines.join("\n");
const plannerData = { version: 4, sections, teamMembers: [], teams: [] };
const totalEffort = sections.flatMap(section => section.tasks).reduce((sum, task) => sum + task.effortDays, 0);

const markdown = `# R4 uploaded-feature delivery plan\n\nThis plan contains only the 25 activities identified by the uploaded prioritisation workbook's R4 capacity bar (priorities 25–49). No roadmap tasks or additional milestones have been added.\n\nPlanning assumptions:\n\n- R4 begins 03 August 2026 and ends 30 September 2026.\n- Activities are staggered into four priority waves.\n- Duration initially equals uploaded effort points in working days because no team allocation or separate duration was supplied.\n- Activities remain allocated to R4 even where their calculated finish extends beyond 30 September.\n- No dependencies or owners have been invented.\n\n## Mermaid Gantt chart\n\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n\n## Planner data\n\n\`\`\`json\n${JSON.stringify(plannerData, null, 2)}\n\`\`\`\n`;

const rowsHtml = sections.flatMap(section => section.tasks).map(task => `<tr><td>${task.sourcePriority}</td><td>${html(task.name)}</td><td>${html(jiraDisplay(task.jira) || "—")}</td><td>${task.effortDays}</td><td>${html(task.startDate)}</td><td>${html(task.dates[1])}</td></tr>`).join("");
const htmlDocument = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>R4 Uploaded Features Gantt</title>
<style>
:root{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#10284e;background:#eef3f8}*{box-sizing:border-box}body{margin:0}.top{background:#061b3f;color:#fff;border-bottom:3px solid #53d22c;padding:18px 24px}.top h1{margin:0;font-size:24px}.top p{margin:5px 0 0;color:#c9d7ea}.summary{display:flex;gap:12px;padding:16px 24px}.card{min-width:150px;background:#fff;border:1px solid #d4deea;padding:12px 14px}.card strong{display:block;font-size:24px}.card span{font-size:11px;color:#60738d}.note{margin:0 24px 14px;padding:10px 12px;background:#fff8df;border-left:4px solid #d9a600;font-size:12px}.chart-shell{margin:0 24px 18px;background:#fff;border:1px solid #d4deea;overflow:auto;padding:12px;min-height:520px}.mermaid{min-width:1600px}.data{margin:0 24px 30px;background:#fff;border:1px solid #d4deea;overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px}th{position:sticky;top:0;background:#e9f0f8;text-align:left;padding:9px;border-bottom:1px solid #c4d1e0}td{padding:8px 9px;border-bottom:1px solid #e4eaf1}td:first-child{font-weight:700;color:#2a8115}
</style></head><body>
<header class="top"><h1>R4 uploaded-feature delivery plan</h1><p>03 Aug–30 Sep 2026 · Activities sourced exclusively from prioritisation workbook positions 25–49</p></header>
<section class="summary"><div class="card"><strong>${rows.length}</strong><span>uploaded activities</span></div><div class="card"><strong>${totalEffort}</strong><span>effort points</span></div><div class="card"><strong>4</strong><span>priority waves</span></div></section>
<p class="note">Durations currently use effort points as working-day placeholders. No owners, dependencies, roadmap tasks or milestones were added.</p>
<main class="chart-shell"><pre class="mermaid">${html(mermaid)}</pre></main>
<section class="data"><table><thead><tr><th>Priority</th><th>Activity</th><th>Jira</th><th>Effort</th><th>Start</th><th>Finish</th></tr></thead><tbody>${rowsHtml}</tbody></table></section>
<script type="module">import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";mermaid.initialize({startOnLoad:true,securityLevel:"loose"});</script>
</body></html>`;

await fs.writeFile(outputMarkdown, markdown, "utf8");
await fs.writeFile(outputHtml, htmlDocument, "utf8");
console.log(JSON.stringify({ activities: rows.length, totalEffort, priorities: [rows[0].priority, rows.at(-1).priority], markdown: outputMarkdown.pathname, html: outputHtml.pathname }));
