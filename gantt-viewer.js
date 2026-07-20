import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";
import { upsertFeatureRows } from "./feature-import.js?v=4";

const DEFAULT_PEOPLE_BY_TEAM = {
  "Leadership Strategy and Planning": ["Tom", "Martin", "Magesan", "David"],
  "User Adoption": ["Jen", "Josh"],
  "Business Partnering": ["James", "Gaurav", "Matt", "Vishal", "Kamila"],
  "Governance and Compliance": ["Tristan", "Edwin"],
  "AI Connectivity": ["Mak", "Sarah"],
  "OpenAI Enablement": ["Joseph"],
  "Build Enablement": ["Dar", "Shub"],
  "Data Management": ["Maria", "Ramya"]
};

const RELEASES = {
  R4: { start: "2026-08-03", end: "2026-09-30", visualEnd: "2026-10-01", color: "#42aa24", border: "#2a8115" },
  R5: { start: "2026-10-01", end: "2026-12-18", visualEnd: "2027-01-04", color: "#1262cf", border: "#0b4da8" },
  R6: { start: "2027-01-04", end: "2027-03-31", visualEnd: "2027-04-01", color: "#e86500", border: "#b94f00" },
  R7: { start: "2027-04-01", end: "2027-06-30", visualEnd: "2027-07-01", color: "#6841ad", border: "#4c2d82" }
};

const TASK_MODIFIERS = new Set(["active", "crit", "done", "milestone"]);
const SOURCE_PLAN = "ai-platform-fy27-detailed-gantt.mmd";
const SOURCE_ACTIVITY_DATA = "ai-platform-fy27-activity-data.json";
const STORAGE_KEY = "ai-platform-fy27-planner-v1";
const FY_START = "2026-08-03";
const FY_END = "2027-06-30";

let teamMembers = Object.entries(DEFAULT_PEOPLE_BY_TEAM).flatMap(([team, people]) => people.map((name, index) => ({
  id: `member-${team.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
  name,
  team,
  role: "",
  leave: []
})));
let teams = Object.entries(DEFAULT_PEOPLE_BY_TEAM).map(([name, people]) => ({
  id: `team-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name,
  leadMemberId: teamMembers.find(member => member.name === people[0])?.id || ""
}));
let peopleByTeam = structuredClone(DEFAULT_PEOPLE_BY_TEAM);
let allPeople = Object.values(peopleByTeam).flat();
const state = {
  source: "",
  parsed: null,
  selectedPeople: new Set(allPeople),
  selectedReleases: new Set(Object.keys(RELEASES)),
  selectedWorkstreams: new Set(),
  selectedTags: new Set(),
  taskSearch: "",
  peopleSearch: "",
  keepGates: true,
  zoom: 1,
  activeView: "timeline",
  timelineGeometry: null,
  lastPointer: null,
  selectedActivityIds: new Set(),
  activitySelectionAnchor: "",
  bulkCommonTags: [],
  activityDataRevision: 0
};

const elements = Object.fromEntries([
  "peopleFilters", "releaseFilters", "workstreamFilters", "tagFilters", "taskSearch", "peopleSearch",
  "peopleSelectionCount", "releaseSelectionCount", "workstreamSelectionCount", "tagSelectionCount", "keepGates",
  "activeFilters", "visibleTasks", "visiblePeople", "visibleWorkstreams", "chart", "chartViewport",
  "loadingState", "emptyState", "renderStatus", "zoomValue", "activityTableBody",
  "activityTableCount", "activityTableSearch", "peopleTableBody", "peopleTableCount", "peopleTableSearch",
  "teamsTableBody", "teamsTableCount", "teamsTableSearch", "releaseRibbon", "releaseTrack", "dateGuide", "dateTooltip",
  "activitySelectionCount", "selectVisibleActivities", "bulkActivityWorkstream", "applyBulkWorkstream", "bulkActivityRelease", "applyBulkRelease", "bulkActivityTags", "applyBulkTags", "clearActivitySelection", "deleteSelectedActivities", "bulkActivityStatus"
].map(id => [id, document.getElementById(id)]));

mermaid.initialize({
  startOnLoad: false,
  securityLevel: "loose",
  theme: "base",
  gantt: { barHeight: 18, barGap: 5, topPadding: 42, leftPadding: 230, gridLineStartPadding: 32, fontSize: 11, numberSectionStyles: 4 },
  themeVariables: {
    fontFamily: "Inter, Segoe UI, Arial, sans-serif",
    fontSize: "11px",
    primaryColor: "#1262cf",
    primaryTextColor: "#10284e",
    primaryBorderColor: "#0b4da8",
    lineColor: "#cbd5e1",
    secondaryColor: "#42aa24",
    tertiaryColor: "#eef3f8",
    sectionBkgColor: "#f7f9fc",
    altSectionBkgColor: "#ffffff",
    sectionBkgColor2: "#edf3fa",
    taskBkgColor: "#1262cf",
    taskBorderColor: "#0b4da8",
    taskTextColor: "#ffffff",
    taskTextOutsideColor: "#10284e",
    activeTaskBkgColor: "#42aa24",
    activeTaskBorderColor: "#2a8115",
    doneTaskBkgColor: "#7890a8",
    doneTaskBorderColor: "#607287",
    critBkgColor: "#e86500",
    critBorderColor: "#b94f00",
    todayLineColor: "#e11d48",
    gridColor: "#e5ebf2"
  }
});

function parseSource(source) {
  const lines = source.split(/\r?\n/);
  const header = [];
  const sections = [];
  let current = null;
  for (const line of lines) {
    const sectionMatch = line.match(/^\s*section\s+(.+?)\s*$/);
    if (sectionMatch) {
      current = { name: sectionMatch[1].trim(), tasks: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      if (line.trim()) header.push(line);
      continue;
    }
    const taskMatch = line.match(/^\s*(.+?)\s*:(.+)$/);
    if (!taskMatch) continue;
    const name = taskMatch[1].trim();
    const metadata = taskMatch[2].trim();
    const dates = [...metadata.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)].map(match => match[1]);
    const owners = allPeople.filter(person => new RegExp(`\\b${person}\\b`, "i").test(name));
    const metadataTokens = metadata.split(",").map(token => token.trim());
    const modifiers = metadataTokens.filter(token => TASK_MODIFIERS.has(token.toLowerCase()));
    const taskId = metadataTokens
      .find(token => /^[a-z][\w-]*$/i.test(token) && !TASK_MODIFIERS.has(token.toLowerCase()));
    const releaseMatch = name.match(/^(?:R|Release\s+)([4-7])\b/i);
    current.tasks.push({
      name,
      metadata,
      dates,
      startDate: dates[0] || "",
      durationDays: modifiers.includes("milestone") ? 0 : workingDaysInclusive(dates[0], dates[1] || dates[0]),
      effortDays: "",
      owners,
      taskId,
      modifiers,
      release: releaseMatch ? `R${releaseMatch[1]}` : "",
      dependencies: [],
      raw: `    ${name} :${metadata}`
    });
  }
  return { header, sections };
}

function dateValue(date) {
  return Date.parse(`${date}T00:00:00Z`);
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function isWorkingDay(value) {
  const day = new Date(`${value}T00:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6;
}

function nextWorkingDay(value) {
  const date = new Date(`${value}T00:00:00Z`);
  do date.setUTCDate(date.getUTCDate() + 1); while (date.getUTCDay() === 0 || date.getUTCDay() === 6);
  return isoDate(date);
}

function addWorkingDaysInclusive(start, duration) {
  if (duration <= 0) return start;
  const date = new Date(`${start}T00:00:00Z`);
  let counted = isWorkingDay(start) ? 1 : 0;
  while (counted < duration) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (date.getUTCDay() !== 0 && date.getUTCDay() !== 6) counted += 1;
  }
  return isoDate(date);
}

function workingDaysInclusive(start, end) {
  if (!start || !end || end < start) return 1;
  const cursor = new Date(`${start}T00:00:00Z`);
  const finish = new Date(`${end}T00:00:00Z`);
  let count = 0;
  while (cursor <= finish) {
    if (cursor.getUTCDay() !== 0 && cursor.getUTCDay() !== 6) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return Math.max(1, count);
}

function createsDependencyCycle(taskId, proposedDependencies) {
  const dependencyMap = new Map(allTasksWithSections().map(({ task }) => [task.taskId, task.taskId === taskId ? proposedDependencies : (task.dependencies || [])]));
  const visiting = new Set();
  const visited = new Set();
  function visit(id) {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dependency of dependencyMap.get(id) || []) if (dependencyMap.has(dependency) && visit(dependency)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  }
  return [...dependencyMap.keys()].some(visit);
}

function calculateSchedule() {
  const taskMap = new Map(allTasksWithSections().map(({ task }) => [task.taskId, task]));
  const visiting = new Set();
  const resolved = new Set();
  function resolve(task) {
    if (resolved.has(task.taskId)) return !task.scheduleError;
    if (visiting.has(task.taskId)) {
      task.scheduleError = "Dependency cycle";
      return false;
    }
    visiting.add(task.taskId);
    task.scheduleError = "";
    let start = task.startDate || "";
    if (start && !isWorkingDay(start)) task.scheduleError = "Start date falls on a weekend";
    if (!start) {
      if (!(task.dependencies || []).length) task.scheduleError = "Add a start date or at least one dependency";
      const dependencies = (task.dependencies || []).map(id => taskMap.get(id));
      if (dependencies.some(dependency => !dependency)) task.scheduleError = "A dependency could not be found";
      if (!task.scheduleError && dependencies.every(resolve)) {
        const latestEnd = dependencies.map(dependency => dependency.dates?.[1] || dependency.dates?.[0]).sort().at(-1);
        if (latestEnd) start = nextWorkingDay(latestEnd);
      } else if (!task.scheduleError) task.scheduleError = "A dependency is not scheduled";
    }
    const duration = taskType(task) === "milestone" ? 0 : Math.max(1, Number(task.durationDays) || 1);
    task.durationDays = duration;
    if (!task.scheduleError && start) {
      const end = addWorkingDaysInclusive(start, duration);
      task.dates = taskType(task) === "milestone" ? [start] : [start, end];
      rebuildTaskRaw(task);
    }
    visiting.delete(task.taskId);
    resolved.add(task.taskId);
    return !task.scheduleError;
  }
  for (const task of taskMap.values()) resolve(task);
}

function releaseSegmentsForTask(task) {
  if (!task.dates.length) return [];
  const taskStart = dateValue(task.dates[0]);
  const taskEnd = dateValue(task.dates[1] || task.dates[0]);
  if (taskEnd <= taskStart) {
    const release = Object.entries(RELEASES).find(([, item]) => task.dates[0] >= item.start && task.dates[0] < item.visualEnd);
    return release ? [{ key: release[0], ...release[1], start: 0, end: 1, startDate: task.dates[0], endDate: task.dates[0] }] : [];
  }

  const duration = taskEnd - taskStart;
  return Object.entries(RELEASES).flatMap(([key, release]) => {
    const overlapStart = Math.max(taskStart, dateValue(release.start));
    const overlapEnd = Math.min(taskEnd, dateValue(release.visualEnd));
    if (overlapEnd <= overlapStart) return [];
    return [{
      key,
      color: release.color,
      border: release.border,
      start: (overlapStart - taskStart) / duration,
      end: (overlapEnd - taskStart) / duration,
      startDate: new Date(overlapStart).toISOString().slice(0, 10),
      endDate: new Date(overlapEnd).toISOString().slice(0, 10)
    }];
  });
}

function applyReleaseTaskColors(tasks) {
  const svg = elements.chart.querySelector("svg");
  if (!svg) return;

  const taskRects = [...svg.querySelectorAll("rect.task")];
  for (const task of tasks) {
    if (!task.renderId || !task.releaseKey) continue;
    const rect = taskRects.find(candidate => candidate.id.endsWith(`-${task.renderId}`));
    if (!rect) continue;
    const release = RELEASES[task.releaseKey];
    rect.dataset.release = task.releaseKey;
    rect.style.setProperty("stroke", release.border, "important");
    rect.style.setProperty("stroke-width", "1", "important");
    rect.style.setProperty("fill", release.color, "important");
  }
}

function assignedReleaseForTask(task) {
  if (task.release && RELEASES[task.release]) return task.release;
  const match = task.name.match(/^(?:R|Release\s+)([4-7])\b/i);
  return match ? `R${match[1]}` : null;
}

function releaseKeysForTask(task) {
  const assigned = assignedReleaseForTask(task);
  if (assigned) return [assigned];
  return releaseSegmentsForTask(task).map(segment => segment.key);
}

function taskLine(name, modifiers, taskId, start, end) {
  const metadata = [...modifiers, taskId, start, end].filter(Boolean).join(", ");
  return `    ${name} :${metadata}`;
}

function expandTaskForReleases(task, selectedReleaseKeys) {
  const assigned = assignedReleaseForTask(task);
  if (assigned) {
    return selectedReleaseKeys.includes(assigned)
      ? [{ ...task, releaseKey: assigned, renderId: task.taskId }]
      : [];
  }

  const allSegments = releaseSegmentsForTask(task);
  const visibleSegments = allSegments.filter(segment => selectedReleaseKeys.includes(segment.key));
  if (allSegments.length <= 1) {
    return visibleSegments.map(segment => ({ ...task, releaseKey: segment.key, renderId: task.taskId }));
  }

  return visibleSegments.map(segment => {
    const renderId = `${task.taskId}-${segment.key.toLowerCase()}`;
    const name = `${task.name} · ${segment.key}`;
    return {
      ...task,
      name,
      releaseKey: segment.key,
      renderId,
      dates: [segment.startDate, segment.endDate],
      raw: taskLine(name, task.modifiers, renderId, segment.startDate, segment.endDate)
    };
  });
}

function selectedSubset(set, completeList) {
  return set.size > 0 && set.size < completeList.length;
}

function normalizeTags(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(/[,;]/);
  const seen = new Set();
  return values.map(tag => String(tag).trim()).filter(tag => {
    const key = tag.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base", numeric: true }) || left.localeCompare(right));
}

function allTags() {
  const tags = new Map();
  for (const { task } of allTasksWithSections()) {
    for (const tag of normalizeTags(task.tags)) if (!tags.has(tag.toLowerCase())) tags.set(tag.toLowerCase(), tag);
  }
  return [...tags.values()].sort((a, b) => a.localeCompare(b));
}

function workstreamNames() {
  return teams.map(team => String(team.name || "").trim()).filter(Boolean);
}

function workstreamForSectionName(sectionName) {
  const value = String(sectionName || "").trim();
  return workstreamNames().find(name => value === name || value.startsWith(`${name} |`)) || "";
}

function sectionForWorkstream(workstream, { create = false } = {}) {
  const name = String(workstream || "").trim();
  const existing = name
    ? state.parsed.sections.find(section => workstreamForSectionName(section.name) === name)
    : state.parsed.sections.find(section => section.name === "Unassigned");
  if (existing || !create) return existing;
  const section = { name: name || "Unassigned", tasks: [] };
  state.parsed.sections.push(section);
  return section;
}

function buildFilteredSource() {
  const selectedPeople = [...state.selectedPeople];
  const selectedReleaseKeys = [...state.selectedReleases];
  const peopleActive = selectedSubset(state.selectedPeople, allPeople);
  const releasesActive = selectedSubset(state.selectedReleases, Object.keys(RELEASES));
  const tagsActive = state.selectedTags.size > 0;
  const definedWorkstreams = workstreamNames();
  const workstreamsActive = selectedSubset(state.selectedWorkstreams, definedWorkstreams);
  const query = state.taskSearch.trim().toLowerCase();
  const visibleSections = [];
  const visibleSectionByName = new Map();

  for (const section of state.parsed.sections) {
    const isGateSection = section.name === "Portfolio gates";
    const workstream = workstreamForSectionName(section.name);
    if (isGateSection && !state.keepGates) continue;
    if (!isGateSection && (!workstream || !state.selectedWorkstreams.has(workstream))) continue;
    const tasks = section.tasks.filter(task => {
      if (!task.dates?.[0] || task.scheduleError) return false;
      const taskReleaseKeys = releaseKeysForTask(task);
      const tagMatch = !tagsActive || normalizeTags(task.tags).some(tag => state.selectedTags.has(tag));
      if (isGateSection && state.keepGates) {
        const releaseMatch = state.selectedReleases.size > 0 && selectedReleaseKeys.some(key => taskReleaseKeys.includes(key));
        return releaseMatch && tagMatch && (!query || task.name.toLowerCase().includes(query));
      }
      if (state.selectedPeople.size === 0 || state.selectedReleases.size === 0) return false;
      const peopleMatch = !peopleActive || task.owners.some(owner => state.selectedPeople.has(owner));
      const releaseMatch = !releasesActive || selectedReleaseKeys.some(key => taskReleaseKeys.includes(key));
      const searchMatch = !query || task.name.toLowerCase().includes(query) || task.owners.some(owner => owner.toLowerCase().includes(query));
      return peopleMatch && releaseMatch && tagMatch && searchMatch;
    });
    if (tasks.length) {
      const displayName = isGateSection ? "Portfolio gates" : workstream;
      const visibleSection = visibleSectionByName.get(displayName);
      if (visibleSection) visibleSection.tasks.push(...tasks);
      else {
        const added = { name: displayName, tasks: [...tasks] };
        visibleSectionByName.set(displayName, added);
        visibleSections.push(added);
      }
    }
  }

  const sourceLines = [...state.parsed.header];
  const renderTasks = [];
  for (const section of visibleSections) {
    sourceLines.push("", `    section ${section.name}`);
    const expandedTasks = section.tasks.flatMap(task => expandTaskForReleases(task, selectedReleaseKeys));
    renderTasks.push(...expandedTasks);
    sourceLines.push(...expandedTasks.map(task => task.raw));
  }
  if (renderTasks.length) {
    sourceLines.push("    FY27 timeline scale anchor :fy27scale, 2026-08-03, 2027-06-30");
  }
  return { source: sourceLines.join("\n"), sections: visibleSections, renderTasks };
}

function hideTimelineScaleAnchor() {
  const svg = elements.chart.querySelector("svg");
  if (!svg) return;
  const anchorRect = [...svg.querySelectorAll("rect.task")].find(rect => rect.id.endsWith("-fy27scale"));
  const anchorText = [...svg.querySelectorAll("text")].find(text => text.id.endsWith("-fy27scale-text"));
  for (const element of [anchorRect, anchorText]) {
    if (!element) continue;
    element.style.setProperty("visibility", "hidden", "important");
    element.style.setProperty("pointer-events", "none", "important");
    element.setAttribute("aria-hidden", "true");
  }
}

function renderPeopleFilters() {
  const needle = state.peopleSearch.toLowerCase();
  elements.peopleFilters.innerHTML = "";
  for (const [team, people] of Object.entries(peopleByTeam)) {
    const matches = people.filter(person => person.toLowerCase().includes(needle) || team.toLowerCase().includes(needle));
    if (!matches.length) continue;
    const group = document.createElement("div");
    group.className = "team-group";
    const selectedInTeam = people.filter(person => state.selectedPeople.has(person)).length;
    group.innerHTML = `<div class="team-heading"><span>${team}</span><span>${selectedInTeam}/${people.length}</span></div>`;
    for (const person of matches) group.append(createCheckboxRow(person, state.selectedPeople.has(person), value => {
      value ? state.selectedPeople.add(person) : state.selectedPeople.delete(person);
      renderPeopleFilters();
      scheduleRender();
    }));
    elements.peopleFilters.append(group);
  }
  elements.peopleSelectionCount.textContent = `${state.selectedPeople.size}/${allPeople.length}`;
}

function createCheckboxRow(label, checked, onChange) {
  const row = document.createElement("label");
  row.className = "check-row";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  const text = document.createElement("span");
  text.textContent = label;
  row.append(input, text);
  return row;
}

function renderReleaseFilters() {
  elements.releaseFilters.innerHTML = "";
  for (const [key, release] of Object.entries(RELEASES)) {
    const label = document.createElement("label");
    label.className = "release-check";
    label.style.setProperty("--release-color", release.color);
    label.innerHTML = `<input type="checkbox" ${state.selectedReleases.has(key) ? "checked" : ""}><span>${key}</span>`;
    label.querySelector("input").addEventListener("change", event => {
      event.target.checked ? state.selectedReleases.add(key) : state.selectedReleases.delete(key);
      scheduleRender();
    });
    elements.releaseFilters.append(label);
  }
  elements.releaseSelectionCount.textContent = `${state.selectedReleases.size}/4`;
}

function renderWorkstreamFilters() {
  elements.workstreamFilters.innerHTML = "";
  const workstreams = workstreamNames();
  state.selectedWorkstreams = new Set([...state.selectedWorkstreams].filter(workstream => workstreams.includes(workstream)));
  for (const workstream of workstreams) {
    elements.workstreamFilters.append(createCheckboxRow(workstream, state.selectedWorkstreams.has(workstream), value => {
      value ? state.selectedWorkstreams.add(workstream) : state.selectedWorkstreams.delete(workstream);
      renderWorkstreamFilters();
      scheduleRender();
    }));
  }
  elements.workstreamSelectionCount.textContent = `${state.selectedWorkstreams.size}/${workstreams.length}`;
}

function renderTagFilters() {
  elements.tagFilters.innerHTML = "";
  const tags = allTags();
  state.selectedTags = new Set([...state.selectedTags].filter(tag => tags.includes(tag)));
  for (const tag of tags) {
    elements.tagFilters.append(createCheckboxRow(tag, state.selectedTags.has(tag), value => {
      value ? state.selectedTags.add(tag) : state.selectedTags.delete(tag);
      renderTagFilters();
      scheduleRender();
    }));
  }
  elements.tagSelectionCount.textContent = `${state.selectedTags.size}/${tags.length}`;
}

function renderFilterChips() {
  const chips = [];
  chips.push(...[...state.selectedTags].map(tag => `Tag · ${tag}`));
  if (state.selectedPeople.size < allPeople.length) chips.push(...[...state.selectedPeople].map(person => `Person · ${person}`));
  if (state.selectedReleases.size < 4) chips.push(...[...state.selectedReleases].map(release => `Release · ${release}`));
  if (state.taskSearch) chips.push(`Search · ${state.taskSearch}`);
  elements.activeFilters.innerHTML = "";
  if (!chips.length) {
    const chip = document.createElement("span");
    chip.className = "filter-chip quiet";
    chip.textContent = "Showing the complete FY27 plan";
    elements.activeFilters.append(chip);
    return;
  }
  for (const text of chips) {
    const chip = document.createElement("span");
    chip.className = "filter-chip";
    chip.textContent = text;
    elements.activeFilters.append(chip);
  }
}

let renderTimer;
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderChart, 120);
}

async function renderChart() {
  const filtered = buildFilteredSource();
  const tasks = filtered.sections.flatMap(section => section.tasks);
  const people = new Set(tasks.flatMap(task => task.owners));
  elements.visibleTasks.textContent = tasks.length;
  elements.visiblePeople.textContent = people.size;
  elements.visibleWorkstreams.textContent = new Set(filtered.sections.filter(section => section.name !== "Portfolio gates").map(section => section.name)).size;
  elements.peopleSelectionCount.textContent = `${state.selectedPeople.size}/${allPeople.length}`;
  elements.releaseSelectionCount.textContent = `${state.selectedReleases.size}/4`;
  renderFilterChips();

  if (!tasks.length) {
    elements.chart.innerHTML = "";
    elements.emptyState.classList.remove("hidden");
    elements.loadingState.classList.add("hidden");
    elements.renderStatus.textContent = "No tasks match the current filters";
    return;
  }

  elements.emptyState.classList.add("hidden");
  elements.loadingState.classList.remove("hidden");
  elements.renderStatus.textContent = "Rendering filtered timeline…";
  try {
    const id = `gantt-${Date.now()}`;
    const { svg, bindFunctions } = await mermaid.render(id, filtered.source);
    elements.chart.innerHTML = svg;
    bindFunctions?.(elements.chart);
    applyReleaseTaskColors(filtered.renderTasks);
    hideTimelineScaleAnchor();
    applyZoom();
    elements.loadingState.classList.add("hidden");
    const releaseBars = filtered.renderTasks.length;
    const renderedWorkstreamCount = new Set(filtered.sections.filter(section => section.name !== "Portfolio gates").map(section => section.name)).size;
    elements.renderStatus.textContent = releaseBars === tasks.length
      ? `${tasks.length} tasks rendered across ${renderedWorkstreamCount} workstreams`
      : `${tasks.length} activities rendered as ${releaseBars} release bars across ${renderedWorkstreamCount} workstreams`;
  } catch (error) {
    elements.loadingState.classList.remove("hidden");
    elements.loadingState.querySelector("strong").textContent = "The chart could not be rendered";
    elements.loadingState.querySelector("span").textContent = error.message;
    elements.renderStatus.textContent = "Mermaid render error";
    console.error(error);
  }
}

function updateTimelineGeometry() {
  const svg = elements.chart.querySelector("svg");
  const anchor = svg?.querySelector('rect[id$="-fy27scale"]');
  if (!svg || !anchor) return;
  const viewBoxWidth = svg.viewBox?.baseVal?.width || Number(svg.getAttribute("width")) || 1;
  const renderedWidth = svg.getBoundingClientRect().width;
  const scale = renderedWidth / viewBoxWidth;
  const chartPadding = parseFloat(getComputedStyle(elements.chart).paddingLeft) || 0;
  state.timelineGeometry = {
    plotLeft: chartPadding + Number(anchor.getAttribute("x")) * scale,
    plotWidth: Number(anchor.getAttribute("width")) * scale
  };
  syncReleaseRibbon();
}

function syncReleaseRibbon() {
  const geometry = state.timelineGeometry;
  if (!geometry) return;
  const contentWidth = Math.max(elements.chart.scrollWidth, elements.chartViewport.clientWidth);
  elements.releaseTrack.style.width = `${contentWidth}px`;
  elements.releaseTrack.style.transform = `translateX(${-elements.chartViewport.scrollLeft}px)`;
  const label = elements.releaseTrack.querySelector(".fy-label");
  label.style.width = `${geometry.plotLeft}px`;
  const total = dateValue(FY_END) - dateValue(FY_START);
  for (const item of elements.releaseTrack.querySelectorAll("[data-release]")) {
    const release = RELEASES[item.dataset.release];
    const startRatio = Math.max(0, (dateValue(release.start) - dateValue(FY_START)) / total);
    const endRatio = Math.min(1, (dateValue(release.visualEnd) - dateValue(FY_START)) / total);
    item.style.left = `${geometry.plotLeft + geometry.plotWidth * startRatio}px`;
    item.style.width = `${geometry.plotWidth * (endRatio - startRatio)}px`;
  }
}

function updateDateHover(event) {
  const geometry = state.timelineGeometry;
  if (!geometry || state.activeView !== "timeline") return;
  const bounds = elements.chartViewport.getBoundingClientRect();
  const localX = event.clientX - bounds.left;
  const localY = event.clientY - bounds.top;
  if (localX < 0 || localX > elements.chartViewport.clientWidth || localY < 0 || localY > elements.chartViewport.clientHeight) {
    elements.dateGuide.classList.add("hidden");
    elements.dateTooltip.classList.add("hidden");
    return;
  }
  const contentX = localX + elements.chartViewport.scrollLeft;
  const ratio = (contentX - geometry.plotLeft) / geometry.plotWidth;
  if (ratio < 0 || ratio > 1) {
    elements.dateGuide.classList.add("hidden");
    elements.dateTooltip.classList.add("hidden");
    return;
  }
  const start = dateValue(FY_START);
  const finish = dateValue(FY_END);
  const date = new Date(start + Math.round((finish - start) * ratio));
  elements.dateTooltip.textContent = new Intl.DateTimeFormat("en-AU", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
  elements.dateGuide.style.left = `${contentX}px`;
  elements.dateGuide.style.top = `${elements.chartViewport.scrollTop}px`;
  elements.dateGuide.style.height = `${elements.chartViewport.clientHeight}px`;
  const tooltipWidth = 128;
  elements.dateTooltip.style.left = `${localX > elements.chartViewport.clientWidth - tooltipWidth - 16 ? contentX - tooltipWidth : contentX + 8}px`;
  elements.dateTooltip.style.top = `${elements.chartViewport.scrollTop + 8}px`;
  elements.dateGuide.classList.remove("hidden");
  elements.dateTooltip.classList.remove("hidden");
}

function applyZoom() {
  const svg = elements.chart.querySelector("svg");
  if (!svg) return;
  const viewBox = svg.viewBox?.baseVal;
  const naturalWidth = viewBox?.width || Number(svg.getAttribute("width")) || 1600;
  svg.style.width = `${Math.round(naturalWidth * state.zoom)}px`;
  elements.zoomValue.textContent = `${Math.round(state.zoom * 100)}%`;
  updateTimelineGeometry();
}

function resetFilters() {
  state.selectedPeople = new Set(allPeople);
  state.selectedReleases = new Set(Object.keys(RELEASES));
  state.selectedWorkstreams = new Set(workstreamNames());
  state.selectedTags.clear();
  state.taskSearch = "";
  state.peopleSearch = "";
  state.keepGates = true;
  elements.taskSearch.value = "";
  elements.peopleSearch.value = "";
  elements.keepGates.checked = true;
  renderPeopleFilters();
  renderReleaseFilters();
  renderWorkstreamFilters();
  renderTagFilters();
  scheduleRender();
}

function exportSvg() {
  const svg = elements.chart.querySelector("svg");
  if (!svg) return;
  const copy = svg.cloneNode(true);
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const blob = new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "ai-platform-fy27-filtered-gantt.svg";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function allTasksWithSections() {
  return state.parsed.sections.flatMap(section => section.tasks.map(task => ({ task, section })));
}

function taskType(task) {
  if (task.modifiers?.includes("milestone")) return "milestone";
  if (task.modifiers?.includes("crit")) return "crit";
  return "activity";
}

function rebuildTaskRaw(task) {
  const modifiers = taskType(task) === "milestone" ? ["milestone"] : taskType(task) === "crit" ? ["crit"] : [];
  task.modifiers = modifiers;
  const end = taskType(task) === "milestone" ? "0d" : task.dates[1];
  task.metadata = [...modifiers, task.taskId, task.dates[0], end].filter(Boolean).join(", ");
  task.raw = `    ${task.name} :${task.metadata}`;
}

function rebuildPeopleIndex() {
  peopleByTeam = Object.fromEntries(teams.map(team => [team.name, []]));
  for (const member of teamMembers) {
    const groupName = member.team || "No team";
    if (!peopleByTeam[groupName]) peopleByTeam[groupName] = [];
    peopleByTeam[groupName].push(member.name);
  }
  allPeople = teamMembers.map(member => member.name);
  state.selectedPeople = new Set([...state.selectedPeople].filter(name => allPeople.includes(name)));
  if (!state.selectedPeople.size && allPeople.length) state.selectedPeople = new Set(allPeople);
}

function saveWorkspace() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, sections: state.parsed.sections, teamMembers, teams, activityDataRevision: state.activityDataRevision }));
}

function loadStoredWorkspace() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved?.sections?.length || !Array.isArray(saved.teamMembers)) return false;
    state.parsed.sections = saved.sections;
    teamMembers = saved.teamMembers.map(member => ({ ...member, leave: Array.isArray(member.leave) ? member.leave : [] }));
    teams = Array.isArray(saved.teams) ? saved.teams : [];
    state.activityDataRevision = Number(saved.activityDataRevision) || 0;
    return true;
  } catch (error) {
    console.warn("Stored planner data could not be loaded", error);
    return false;
  }
}

function activityIdentity(name, jira) {
  const normalizedName = String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
  const jiraText = String(jira || "").trim();
  const jiraTicket = jiraText.match(/\bFDAP-\d+\b/i);
  return `${normalizedName}\u001f${(jiraTicket?.[0] || jiraText).toLowerCase()}`;
}

function activityTaskIdStem(name, jira) {
  const jiraText = String(jira || "").trim();
  const jiraTicket = jiraText.match(/\bFDAP-\d+\b/i);
  const jiraPart = (jiraTicket?.[0] || jiraText || "no-jira").toLowerCase();
  return `${String(name || "").trim()}-${jiraPart}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "activity-no-jira";
}

function uniqueActivityTaskId(name, jira, excludedId = "") {
  const existingIds = new Set(allTasksWithSections().map(({ task }) => task.taskId).filter(taskId => taskId !== excludedId));
  const base = `activity-${activityTaskIdStem(name, jira)}`;
  let taskId = base;
  let suffix = 2;
  while (existingIds.has(taskId)) taskId = `${base}-${suffix++}`;
  return taskId;
}

async function mergeSourceActivityData() {
  const response = await fetch(SOURCE_ACTIVITY_DATA, { cache: "no-store" });
  if (!response.ok) throw new Error(`Activity data returned ${response.status}`);
  const sourceData = await response.json();
  const revision = Number(sourceData?.revision) || 0;
  if (!Array.isArray(sourceData?.activities)) throw new Error("The activity data file is invalid");
  if (revision <= state.activityDataRevision) return;

  const records = allTasksWithSections();
  const recordsByIdentity = new Map();
  for (const record of records) {
    const key = activityIdentity(record.task.name, record.task.jira);
    if (!recordsByIdentity.has(key)) recordsByIdentity.set(key, record);
  }
  const existingIds = new Set(records.map(({ task }) => task.taskId));
  const unassigned = sectionForWorkstream("", { create: true });

  for (const sourceTask of sourceData.activities) {
    const name = String(sourceTask?.name || "").trim();
    const jira = String(sourceTask?.jira || "").trim();
    if (!name) continue;
    const key = activityIdentity(name, jira);
    const existing = recordsByIdentity.get(key);
    if (existing) {
      if (!existing.task.release && /^R[4-7]$/.test(sourceTask.release || "")) existing.task.release = sourceTask.release;
      if ((existing.task.effortDays === "" || existing.task.effortDays === null || existing.task.effortDays === undefined) && sourceTask.effortDays !== "") {
        existing.task.effortDays = sourceTask.effortDays;
      }
      continue;
    }

    const idStem = `activity-${activityTaskIdStem(name, jira)}`;
    let taskId = idStem;
    let suffix = 2;
    while (existingIds.has(taskId)) taskId = `${idStem}-${suffix++}`;
    existingIds.add(taskId);
    const task = {
      taskId,
      name,
      jira,
      startDate: "",
      durationDays: 10,
      effortDays: sourceTask.effortDays ?? "",
      dates: [],
      modifiers: [],
      release: /^R[4-7]$/.test(sourceTask.release || "") ? sourceTask.release : "",
      tags: [],
      owners: [],
      dependencies: [],
      metadata: taskId,
      raw: `    ${name} :${taskId}`
    };
    unassigned.tasks.push(task);
    recordsByIdentity.set(key, { task, section: unassigned });
  }
  state.activityDataRevision = revision;
}

function normalizeWorkspace() {
  const seenTaskIds = new Set();
  for (const section of state.parsed.sections) {
    section.name ||= "Unassigned";
    section.tasks = Array.isArray(section.tasks) ? section.tasks : [];
    for (const task of section.tasks) {
      task.name ||= "Untitled activity";
      task.taskId ||= `task-${Date.now().toString(36)}-${seenTaskIds.size}`;
      while (seenTaskIds.has(task.taskId)) task.taskId = `${task.taskId}-${seenTaskIds.size}`;
      seenTaskIds.add(task.taskId);
      task.dates = Array.isArray(task.dates) ? task.dates.filter(Boolean) : [];
      task.modifiers = Array.isArray(task.modifiers) ? task.modifiers : [];
      task.owners = Array.isArray(task.owners) ? task.owners : [];
      task.dependencies = Array.isArray(task.dependencies) ? task.dependencies : [];
      task.jira = String(task.jira || "").trim();
      task.tags = normalizeTags(task.tags);
      if (task.startDate === undefined) task.startDate = task.dates[0] || "";
      if (!Number.isFinite(Number(task.durationDays))) task.durationDays = taskType(task) === "milestone" ? 0 : workingDaysInclusive(task.dates[0], task.dates[1] || task.dates[0]);
      task.durationDays = taskType(task) === "milestone" ? 0 : Math.max(1, Math.round(Number(task.durationDays) || 1));
      const effort = task.effortDays === "" || task.effortDays === null || task.effortDays === undefined ? "" : Number(task.effortDays);
      task.effortDays = Number.isFinite(effort) && effort >= 0 ? effort : "";
      task.release = /^R[4-7]$/.test(task.release || "") ? task.release : "";
    }
  }
  teamMembers = teamMembers.map((member, index) => ({
    id: member.id || `member-${index}-${String(member.name || "person").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: member.name || "Unnamed team member",
    team: String(member.team || "").trim(),
    role: String(member.role || "").trim(),
    leave: Array.isArray(member.leave) ? member.leave.filter(period => period?.from && period?.to) : []
  }));
  const memberTeams = [...new Set(teamMembers.map(member => member.team).filter(Boolean))];
  if (!teams.length) {
    teams = memberTeams.map(name => ({
      id: `team-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      leadMemberId: teamMembers.find(member => member.team === name)?.id || ""
    }));
  }
  teams = teams.map((team, index) => ({
    id: team.id || `team-${index}-${String(team.name || "team").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name: team.name || `Team ${index + 1}`,
    leadMemberId: teamMembers.some(member => member.id === team.leadMemberId && member.team === team.name) ? team.leadMemberId : ""
  }));
  for (const name of memberTeams) {
    if (!teams.some(team => team.name === name)) teams.push({ id: `team-${Date.now().toString(36)}-${teams.length}`, name, leadMemberId: "" });
  }
  calculateSchedule();
}

function refreshEditorsAndPlan({ resetPlanFilters = false } = {}) {
  calculateSchedule();
  rebuildPeopleIndex();
  if (resetPlanFilters) {
    state.selectedPeople = new Set(allPeople);
    state.selectedWorkstreams = new Set(workstreamNames());
    state.selectedTags.clear();
  }
  renderPeopleFilters();
  renderWorkstreamFilters();
  renderTagFilters();
  renderActivityEditor();
  renderPeopleEditor();
  renderTeamsEditor();
  saveWorkspace();
  scheduleRender();
}

function releaseBadge(release) {
  if (!release) return "";
  return `<span class="release-badge" style="--release-color:${RELEASES[release]?.color || "#7890a8"}">${escapeHtml(release)}</span>`;
}

function displayJira(value) {
  const text = String(value || "").trim();
  const ticket = text.match(/\bFDAP-\d+\b/i);
  return ticket ? ticket[0].toUpperCase() : text;
}

function filteredActivityRows() {
  const query = elements.activityTableSearch.value.trim().toLowerCase();
  return allTasksWithSections().filter(({ task, section }) => {
    const haystack = [task.name, task.jira, workstreamForSectionName(section.name), task.release, ...normalizeTags(task.tags), ...(task.owners || [])].join(" ").toLowerCase();
    return !query || haystack.includes(query);
  });
}

function updateActivitySelectionControls(rows) {
  const validIds = new Set(allTasksWithSections().map(({ task }) => task.taskId));
  state.selectedActivityIds = new Set([...state.selectedActivityIds].filter(id => validIds.has(id)));
  elements.selectVisibleActivities.disabled = rows.length === 0;
  const selectedCount = state.selectedActivityIds.size;
  elements.activitySelectionCount.textContent = `${selectedCount} selected`;
  elements.applyBulkWorkstream.disabled = selectedCount === 0;
  elements.applyBulkRelease.disabled = selectedCount === 0;
  elements.applyBulkTags.disabled = selectedCount === 0;
  elements.clearActivitySelection.disabled = selectedCount === 0;
  elements.deleteSelectedActivities.disabled = selectedCount === 0;
  const selectedTasks = allTasksWithSections().map(({ task }) => task).filter(task => state.selectedActivityIds.has(task.taskId));
  const commonTags = selectedTasks.length
    ? normalizeTags(selectedTasks[0].tags).filter(tag => selectedTasks.every(task => normalizeTags(task.tags).some(candidate => candidate.toLowerCase() === tag.toLowerCase())))
    : [];
  state.bulkCommonTags = commonTags;
  elements.bulkActivityTags.value = commonTags.join(", ");
}

function renderBulkActivityWorkstreams() {
  const current = elements.bulkActivityWorkstream.value;
  const workstreams = workstreamNames();
  elements.bulkActivityWorkstream.innerHTML = `<option value="">No workstream</option>${workstreams.map(workstream => `<option value="${escapeHtml(workstream)}">${escapeHtml(workstream)}</option>`).join("")}`;
  elements.bulkActivityWorkstream.value = workstreams.includes(current) ? current : "";
}

function renderActivityEditor() {
  if (!elements.activityTableBody) return;
  renderBulkActivityWorkstreams();
  const rows = filteredActivityRows();
  const taskNameById = new Map(allTasksWithSections().map(({ task }) => [task.taskId, task.name]));
  elements.activityTableBody.innerHTML = rows.map(({ task, section }) => {
    const dependencies = (task.dependencies || []).map(id => taskNameById.get(id) || id);
    const selected = state.selectedActivityIds.has(task.taskId);
    const selectionClass = [selected ? "activity-selected" : "", selected && state.activitySelectionAnchor === task.taskId ? "activity-selection-anchor" : ""].filter(Boolean).join(" ");
    return `<tr data-task-id="${escapeHtml(task.taskId)}" class="${selectionClass}" tabindex="0" aria-selected="${selected}">
      <td>${escapeHtml(task.name)}</td>
      <td>${task.jira ? `<span class="jira-ticket" title="${escapeHtml(task.jira)}">${escapeHtml(displayJira(task.jira))}</span>` : '<span class="empty-inline">—</span>'}</td>
      <td>${escapeHtml(workstreamForSectionName(section.name))}</td>
      <td>${releaseBadge(task.release)}</td>
      <td>${escapeHtml(normalizeTags(task.tags).join(", "))}</td>
      <td>${escapeHtml(task.dates?.[0] || "")}${task.startDate ? "" : '<div class="cell-subtle">Auto-scheduled</div>'}${task.scheduleError ? `<div class="schedule-error">${escapeHtml(task.scheduleError)}</div>` : ""}</td>
      <td>${taskType(task) === "milestone" ? "—" : `${escapeHtml(task.durationDays)} wd`}</td>
      <td>${task.effortDays === "" ? '<span class="empty-inline">—</span>' : `${escapeHtml(task.effortDays)} d`}</td>
      <td>${escapeHtml(task.dates?.[1] || task.dates?.[0] || "")}</td>
      <td>${escapeHtml((task.owners || []).join(", ") || "—")}</td>
      <td>${escapeHtml(dependencies.join(", ") || "—")}</td>
      <td><div class="table-row-actions"><button class="table-action edit-task" type="button">Edit</button><button class="table-action danger delete-task" type="button">Delete</button></div></td>
    </tr>`;
  }).join("");
  updateActivitySelectionControls(rows);
  elements.activityTableCount.textContent = `${rows.length} of ${allTasksWithSections().length} activities · ${state.selectedActivityIds.size} selected`;
}

function selectActivityRow(taskId, { extendRange = false, toggle = false } = {}) {
  const rows = filteredActivityRows();
  const ids = rows.map(({ task }) => task.taskId);
  const currentIndex = ids.indexOf(taskId);
  const anchorIndex = ids.indexOf(state.activitySelectionAnchor);
  if (extendRange && currentIndex >= 0 && anchorIndex >= 0) {
    const [start, end] = [Math.min(currentIndex, anchorIndex), Math.max(currentIndex, anchorIndex)];
    ids.slice(start, end + 1).forEach(id => state.selectedActivityIds.add(id));
  } else if (toggle) {
    state.selectedActivityIds.has(taskId) ? state.selectedActivityIds.delete(taskId) : state.selectedActivityIds.add(taskId);
  } else {
    state.selectedActivityIds = new Set([taskId]);
  }
  state.activitySelectionAnchor = taskId;
  elements.bulkActivityStatus.textContent = "";
  renderActivityEditor();
}

function applyBulkActivityRelease() {
  const selectedIds = state.selectedActivityIds;
  if (!selectedIds.size) return;
  const release = elements.bulkActivityRelease.value;
  let updated = 0;
  for (const { task } of allTasksWithSections()) {
    if (!selectedIds.has(task.taskId)) continue;
    task.release = release;
    updated += 1;
  }
  refreshEditorsAndPlan();
  elements.bulkActivityStatus.textContent = release
    ? `${updated} ${updated === 1 ? "activity" : "activities"} set to ${release}.`
    : `${updated} ${updated === 1 ? "activity" : "activities"} cleared of release allocation.`;
}

function applyBulkActivityWorkstream() {
  const selectedRecords = allTasksWithSections().filter(({ task }) => state.selectedActivityIds.has(task.taskId));
  if (!selectedRecords.length) return;
  const workstream = elements.bulkActivityWorkstream.value;
  const targetSection = sectionForWorkstream(workstream, { create: true });
  for (const record of selectedRecords) {
    if (record.section === targetSection) continue;
    record.section.tasks = record.section.tasks.filter(task => task !== record.task);
    targetSection.tasks.push(record.task);
  }
  refreshEditorsAndPlan();
  elements.bulkActivityStatus.textContent = workstream
    ? `${selectedRecords.length} ${selectedRecords.length === 1 ? "activity" : "activities"} set to ${workstream}.`
    : `${selectedRecords.length} ${selectedRecords.length === 1 ? "activity" : "activities"} cleared of workstream allocation.`;
}

function applyBulkActivityTags() {
  if (!state.selectedActivityIds.size) return;
  const replacement = normalizeTags(elements.bulkActivityTags.value);
  const commonKeys = new Set(normalizeTags(state.bulkCommonTags).map(tag => tag.toLowerCase()));
  let updated = 0;
  for (const { task } of allTasksWithSections()) {
    if (!state.selectedActivityIds.has(task.taskId)) continue;
    const activitySpecificTags = normalizeTags(task.tags).filter(tag => !commonKeys.has(tag.toLowerCase()));
    task.tags = normalizeTags([...activitySpecificTags, ...replacement]);
    updated += 1;
  }
  elements.bulkActivityStatus.textContent = replacement.length
    ? `Common tags updated on ${updated} ${updated === 1 ? "activity" : "activities"}; activity-specific tags were preserved.`
    : `Common tags removed from ${updated} ${updated === 1 ? "activity" : "activities"}; activity-specific tags were preserved.`;
  refreshEditorsAndPlan();
}

function deleteSelectedActivities() {
  const selectedIds = new Set(state.selectedActivityIds);
  const selectedCount = selectedIds.size;
  if (!selectedCount || !confirm(`Delete ${selectedCount} selected ${selectedCount === 1 ? "activity" : "activities"}? This cannot be undone.`)) return;
  for (const section of state.parsed.sections) section.tasks = section.tasks.filter(task => !selectedIds.has(task.taskId));
  for (const { task } of allTasksWithSections()) {
    const removedDependency = (task.dependencies || []).some(id => selectedIds.has(id));
    if (removedDependency && !task.startDate) task.startDate = task.dates?.[0] || "";
    task.dependencies = (task.dependencies || []).filter(id => !selectedIds.has(id));
  }
  state.selectedActivityIds.clear();
  state.activitySelectionAnchor = "";
  refreshEditorsAndPlan({ resetPlanFilters: true });
  elements.bulkActivityStatus.textContent = `${selectedCount} ${selectedCount === 1 ? "activity" : "activities"} deleted.`;
}

function populateActivityDialog(taskId = "") {
  const dialog = document.getElementById("activityDialog");
  const record = allTasksWithSections().find(({ task }) => task.taskId === taskId);
  const task = record?.task;
  document.getElementById("activityDialogTitle").textContent = task ? "Edit activity" : "Add activity";
  document.getElementById("activityEditId").value = task?.taskId || "";
  document.getElementById("activityName").value = task?.name || "";
  document.getElementById("activityJira").value = task?.jira || "";
  document.getElementById("activityTags").value = normalizeTags(task?.tags).join(", ");
  document.getElementById("activityType").value = task ? taskType(task) : "activity";
  document.getElementById("activityRelease").value = task?.release || assignedReleaseForTask(task || { name: "" }) || "";
  document.getElementById("activityStart").value = task?.startDate ?? "";
  const duration = document.getElementById("activityDuration");
  duration.value = task?.durationDays ?? 10;
  duration.disabled = task ? taskType(task) === "milestone" : false;
  duration.min = task && taskType(task) === "milestone" ? "0" : "1";
  document.getElementById("activityEffort").value = task?.effortDays ?? "";
  document.getElementById("activityFormError").textContent = "";
  const workstream = document.getElementById("activityWorkstream");
  workstream.innerHTML = `<option value=""></option>${workstreamNames().map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}`;
  workstream.value = record ? workstreamForSectionName(record.section.name) : "";
  const owners = document.getElementById("activityOwners");
  owners.innerHTML = teamMembers.map(member => `<option value="${escapeHtml(member.name)}">${escapeHtml(member.name)} · ${escapeHtml(member.team || "No team")}</option>`).join("");
  for (const option of owners.options) option.selected = (task?.owners || []).includes(option.value);
  const dependencies = document.getElementById("activityDependencies");
  dependencies.innerHTML = allTasksWithSections().filter(({ task: candidate }) => candidate.taskId !== taskId)
    .map(({ task: candidate }) => `<option value="${escapeHtml(candidate.taskId)}">${escapeHtml(candidate.name)}</option>`).join("");
  for (const option of dependencies.options) option.selected = (task?.dependencies || []).includes(option.value);
  dialog.showModal();
}

function saveActivityFromForm(event) {
  event.preventDefault();
  const id = document.getElementById("activityEditId").value;
  const name = document.getElementById("activityName").value.trim();
  const start = document.getElementById("activityStart").value;
  const duration = Number(document.getElementById("activityDuration").value);
  const effortValue = document.getElementById("activityEffort").value.trim();
  const effort = effortValue === "" ? "" : Number(effortValue);
  const jira = document.getElementById("activityJira").value.trim();
  const dependencies = [...document.getElementById("activityDependencies").selectedOptions].map(option => option.value);
  const error = document.getElementById("activityFormError");
  if (!name || (!start && !dependencies.length) || (start && !isWorkingDay(start))) {
    error.textContent = !name ? "Name is required." : start ? "Start date must be a Monday to Friday working day." : "Provide a start date or at least one dependency.";
    return;
  }
  const type = document.getElementById("activityType").value;
  if (type !== "milestone" && (!Number.isInteger(duration) || duration < 1)) {
    error.textContent = "Duration must be at least one whole working day.";
    return;
  }
  if (effort !== "" && (!Number.isFinite(effort) || effort < 0)) {
    error.textContent = "Effort must be zero or a positive number of person-days.";
    return;
  }
  const duplicate = allTasksWithSections().some(({ task }) => task.taskId !== id && activityIdentity(task.name, task.jira) === activityIdentity(name, jira));
  if (duplicate) {
    error.textContent = "An activity with this name and Jira ID already exists.";
    return;
  }
  const proposedId = id || uniqueActivityTaskId(name, jira);
  if (createsDependencyCycle(proposedId, dependencies)) {
    error.textContent = "This dependency selection would create a cycle.";
    return;
  }
  const targetSectionName = document.getElementById("activityWorkstream").value;
  const current = allTasksWithSections().find(({ task }) => task.taskId === id);
  const task = current?.task || { taskId: proposedId, metadata: "" };
  task.name = name;
  task.jira = jira;
  task.startDate = start;
  task.durationDays = type === "milestone" ? 0 : duration;
  task.effortDays = effort;
  task.modifiers = type === "milestone" ? ["milestone"] : type === "crit" ? ["crit"] : [];
  task.release = document.getElementById("activityRelease").value;
  task.tags = normalizeTags(document.getElementById("activityTags").value);
  task.owners = [...document.getElementById("activityOwners").selectedOptions].map(option => option.value);
  task.dependencies = dependencies;
  const currentWorkstream = current ? workstreamForSectionName(current.section.name) : null;
  if (current && currentWorkstream !== targetSectionName) current.section.tasks = current.section.tasks.filter(item => item !== task);
  if (!current || currentWorkstream !== targetSectionName) sectionForWorkstream(targetSectionName, { create: true }).tasks.push(task);
  document.getElementById("activityDialog").close();
  refreshEditorsAndPlan({ resetPlanFilters: true });
}

function deleteActivity(taskId) {
  const record = allTasksWithSections().find(({ task }) => task.taskId === taskId);
  if (!record || !confirm(`Delete “${record.task.name}”?`)) return;
  record.section.tasks = record.section.tasks.filter(task => task.taskId !== taskId);
  for (const { task } of allTasksWithSections()) {
    if ((task.dependencies || []).includes(taskId) && !task.startDate) task.startDate = task.dates?.[0] || "";
    task.dependencies = (task.dependencies || []).filter(id => id !== taskId);
  }
  refreshEditorsAndPlan({ resetPlanFilters: true });
}

function renderPeopleEditor() {
  if (!elements.peopleTableBody) return;
  const query = elements.peopleTableSearch.value.trim().toLowerCase();
  const members = teamMembers.filter(member => !query || `${member.name} ${member.team || "No team"} ${member.role || ""}`.toLowerCase().includes(query));
  elements.peopleTableBody.innerHTML = members.map(member => {
    const leave = (member.leave || []).map((period, index) => `<span class="leave-chip">${escapeHtml(period.from)} → ${escapeHtml(period.to)}<button class="edit-leave" type="button" data-leave-index="${index}" title="Edit leave">Edit</button><button class="delete-leave" type="button" data-leave-index="${index}" title="Delete leave">×</button></span>`).join("");
    return `<tr data-member-id="${escapeHtml(member.id)}"><td>${escapeHtml(member.name)}</td><td>${member.team ? escapeHtml(member.team) : '<span class="empty-inline">No team</span>'}</td><td>${member.role ? escapeHtml(member.role) : '<span class="empty-inline">No role recorded</span>'}</td><td><div class="leave-list">${leave || '<span class="empty-inline">No leave recorded</span>'}</div></td><td><div class="table-row-actions"><button class="table-action add-leave" type="button">Add leave</button><button class="table-action edit-member" type="button">Edit</button><button class="table-action danger delete-member" type="button">Delete</button></div></td></tr>`;
  }).join("");
  elements.peopleTableCount.textContent = `${members.length} of ${teamMembers.length} team members`;
}

function openMemberDialog(memberId = "") {
  const member = teamMembers.find(item => item.id === memberId);
  document.getElementById("memberDialogTitle").textContent = member ? "Edit team member" : "Add team member";
  document.getElementById("memberEditId").value = member?.id || "";
  document.getElementById("memberName").value = member?.name || "";
  document.getElementById("memberRole").value = member?.role || "";
  const teamSelect = document.getElementById("memberTeam");
  teamSelect.innerHTML = `<option value="">No team</option>${teams.map(team => `<option value="${escapeHtml(team.name)}">${escapeHtml(team.name)}</option>`).join("")}`;
  teamSelect.value = member?.team || "";
  document.getElementById("memberFormError").textContent = "";
  document.getElementById("memberDialog").showModal();
}

function saveMemberFromForm(event) {
  event.preventDefault();
  const id = document.getElementById("memberEditId").value;
  const name = document.getElementById("memberName").value.trim();
  const team = document.getElementById("memberTeam").value.trim();
  const role = document.getElementById("memberRole").value.trim();
  const duplicate = teamMembers.find(member => member.name.toLowerCase() === name.toLowerCase() && member.id !== id);
  if (!name || duplicate) {
    document.getElementById("memberFormError").textContent = duplicate ? "A team member with this name already exists." : "Name is required.";
    return;
  }
  const member = teamMembers.find(item => item.id === id);
  if (member) {
    const oldName = member.name;
    const oldTeam = member.team;
    member.name = name;
    member.team = team;
    member.role = role;
    if (oldTeam !== team) {
      const previousTeam = teams.find(item => item.name === oldTeam);
      if (previousTeam?.leadMemberId === member.id) previousTeam.leadMemberId = "";
    }
    for (const { task } of allTasksWithSections()) task.owners = (task.owners || []).map(owner => owner === oldName ? name : owner);
  } else {
    teamMembers.push({ id: `member-${Date.now().toString(36)}`, name, team, role, leave: [] });
  }
  document.getElementById("memberDialog").close();
  refreshEditorsAndPlan({ resetPlanFilters: true });
}

function deleteMember(memberId) {
  const member = teamMembers.find(item => item.id === memberId);
  if (!member || !confirm(`Delete ${member.name} and remove them from all activity allocations?`)) return;
  teamMembers = teamMembers.filter(item => item.id !== memberId);
  for (const team of teams) if (team.leadMemberId === memberId) team.leadMemberId = "";
  for (const { task } of allTasksWithSections()) task.owners = (task.owners || []).filter(owner => owner !== member.name);
  refreshEditorsAndPlan({ resetPlanFilters: true });
}

function renderTeamsEditor() {
  if (!elements.teamsTableBody) return;
  const query = elements.teamsTableSearch.value.trim().toLowerCase();
  const rows = teams.filter(team => !query || team.name.toLowerCase().includes(query) || (teamMembers.find(member => member.id === team.leadMemberId)?.name || "").toLowerCase().includes(query));
  elements.teamsTableBody.innerHTML = rows.map(team => {
    const members = teamMembers.filter(member => member.team === team.name);
    const lead = teamMembers.find(member => member.id === team.leadMemberId && member.team === team.name);
    return `<tr data-team-id="${escapeHtml(team.id)}"><td><strong>${escapeHtml(team.name)}</strong></td><td>${lead ? `<span class="lead-badge">${escapeHtml(lead.name)}</span>` : '<span class="empty-inline">No lead selected</span>'}</td><td>${escapeHtml(members.map(member => member.name).join(", ") || "No members")}</td><td><div class="table-row-actions"><button class="table-action edit-team" type="button">Edit</button><button class="table-action danger delete-team" type="button">Delete</button></div></td></tr>`;
  }).join("");
  elements.teamsTableCount.textContent = `${rows.length} of ${teams.length} teams`;
}

function openTeamDialog(teamId = "") {
  const team = teams.find(item => item.id === teamId);
  document.getElementById("teamDialogTitle").textContent = team ? "Edit team" : "Add team";
  document.getElementById("teamEditId").value = team?.id || "";
  document.getElementById("teamName").value = team?.name || "";
  document.getElementById("teamFormError").textContent = "";
  const eligibleMembers = team ? teamMembers.filter(member => member.team === team.name) : [];
  const lead = document.getElementById("teamLead");
  lead.innerHTML = `<option value="">No team lead</option>${eligibleMembers.map(member => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}</option>`).join("")}`;
  lead.value = team?.leadMemberId || "";
  document.getElementById("teamFormHelp").textContent = eligibleMembers.length ? "The lead must be a member of this team." : "Assign staff to this team before selecting its lead.";
  document.getElementById("teamDialog").showModal();
}

function saveTeamFromForm(event) {
  event.preventDefault();
  const id = document.getElementById("teamEditId").value;
  const name = document.getElementById("teamName").value.trim();
  const leadMemberId = document.getElementById("teamLead").value;
  const duplicate = teams.find(team => team.name.toLowerCase() === name.toLowerCase() && team.id !== id);
  if (!name || duplicate) {
    document.getElementById("teamFormError").textContent = duplicate ? "A team with this name already exists." : "Team name is required.";
    return;
  }
  const team = teams.find(item => item.id === id);
  if (team) {
    const oldName = team.name;
    const assignedSections = state.parsed.sections.filter(section => section.name === oldName || section.name.startsWith(`${oldName} |`));
    team.name = name;
    team.leadMemberId = leadMemberId;
    for (const member of teamMembers) if (member.team === oldName) member.team = name;
    for (const section of assignedSections) section.name = name;
  } else {
    teams.push({ id: `team-${Date.now().toString(36)}`, name, leadMemberId: "" });
  }
  document.getElementById("teamDialog").close();
  refreshEditorsAndPlan({ resetPlanFilters: true });
}

function deleteTeam(teamId) {
  const team = teams.find(item => item.id === teamId);
  if (!team) return;
  const memberCount = teamMembers.filter(member => member.team === team.name).length;
  const memberMessage = memberCount ? ` The ${memberCount} assigned team member${memberCount === 1 ? "" : "s"} will be moved to No team.` : "";
  if (!confirm(`Delete team “${team.name}”?${memberMessage}`)) return;
  for (const member of teamMembers) if (member.team === team.name) member.team = "";
  for (const section of state.parsed.sections) {
    if (section.name === team.name || section.name.startsWith(`${team.name} |`)) section.name = "Unassigned";
  }
  teams = teams.filter(item => item.id !== teamId);
  refreshEditorsAndPlan({ resetPlanFilters: true });
}

function openLeaveDialog(memberId, leaveIndex = "") {
  const member = teamMembers.find(item => item.id === memberId);
  const period = leaveIndex === "" ? null : member?.leave?.[Number(leaveIndex)];
  document.getElementById("leaveDialogTitle").textContent = `${period ? "Edit" : "Add"} leave · ${member?.name || ""}`;
  document.getElementById("leaveMemberId").value = memberId;
  document.getElementById("leaveEditIndex").value = leaveIndex;
  document.getElementById("leaveFrom").value = period?.from || "";
  document.getElementById("leaveTo").value = period?.to || "";
  syncLeaveDateBounds();
  document.getElementById("leaveFormError").textContent = "";
  document.getElementById("leaveDialog").showModal();
}

function syncLeaveDateBounds() {
  const from = document.getElementById("leaveFrom");
  const to = document.getElementById("leaveTo");
  to.min = from.value || FY_START;
  if (to.value && from.value && to.value < from.value) to.value = "";
}

function saveLeaveFromForm(event) {
  event.preventDefault();
  const member = teamMembers.find(item => item.id === document.getElementById("leaveMemberId").value);
  const index = document.getElementById("leaveEditIndex").value;
  const from = document.getElementById("leaveFrom").value;
  const to = document.getElementById("leaveTo").value;
  if (!member || !from || !to || to < from) {
    document.getElementById("leaveFormError").textContent = to < from ? "Leave end must be on or after the start." : "Both leave dates are required.";
    return;
  }
  if (index === "") member.leave.push({ from, to }); else member.leave[Number(index)] = { from, to };
  member.leave.sort((a, b) => a.from.localeCompare(b.from));
  document.getElementById("leaveDialog").close();
  refreshEditorsAndPlan();
}

function deleteLeave(memberId, index) {
  const member = teamMembers.find(item => item.id === memberId);
  if (!member || !confirm(`Delete leave ${member.leave[index].from} to ${member.leave[index].to}?`)) return;
  member.leave.splice(index, 1);
  refreshEditorsAndPlan();
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function completeMermaidSource() {
  const lines = [...state.parsed.header];
  for (const section of state.parsed.sections) {
    lines.push("", `    section ${section.name}`);
    lines.push(...section.tasks.filter(task => task.dates?.[0] && !task.scheduleError).map(task => { rebuildTaskRaw(task); return task.raw; }));
  }
  return lines.join("\n");
}

function exportMarkdownPlan() {
  const plannerData = JSON.stringify({ version: 4, sections: state.parsed.sections, teamMembers, teams }, null, 2);
  const markdown = `# AI Platform FY27 editable delivery plan\n\n## Mermaid Gantt chart\n\n\`\`\`mermaid\n${completeMermaidSource()}\n\`\`\`\n\n## Planner data\n\n\`\`\`json\n${plannerData}\n\`\`\`\n`;
  downloadBlob(new Blob([markdown], { type: "text/markdown;charset=utf-8" }), "ai-platform-fy27-editable-plan.md");
}

async function importMarkdownPlan(file) {
  const markdown = await file.text();
  const block = markdown.match(/```mermaid\s*([\s\S]*?)```/i);
  if (!block) throw new Error("The Markdown file does not contain a Mermaid Gantt block.");
  const dataBlock = markdown.match(/```json\s*([\s\S]*?)```/i);
  state.source = block[1].trim();
  const parsed = parseSource(state.source);
  if (dataBlock) {
    const saved = JSON.parse(dataBlock[1]);
    if (!saved?.sections?.length) throw new Error("The planner data block is invalid.");
    parsed.sections = saved.sections;
    if (Array.isArray(saved.teamMembers)) teamMembers = saved.teamMembers;
    if (Array.isArray(saved.teams)) teams = saved.teams;
  }
  state.parsed = parsed;
  normalizeWorkspace();
  refreshEditorsAndPlan({ resetPlanFilters: true });
}

function excelDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  return String(value || "").slice(0, 10);
}

async function importFeatures(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheetName = Object.keys(workbook.Sheets).find(name => name.trim().toLowerCase() === "features");
  if (!sheetName) throw new Error('The workbook must contain a sheet named "Features".');
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
  if (!rows.length) throw new Error('The "Features" sheet is empty.');
  const { created, updated, skipped } = upsertFeatureRows(rows, state.parsed.sections);
  if (!created && !updated) throw new Error('No feature names were found in the "Features" sheet.');
  refreshEditorsAndPlan({ resetPlanFilters: true });
  alert(`Feature import complete: ${created} created, ${updated} updated${skipped ? `, ${skipped} skipped` : ""}. New features have no workstream and remain unscheduled until a start date or dependency is set.`);
  return { created, updated, skipped };
}

function exportExcelPlan() {
  const workbook = XLSX.utils.book_new();
  const activities = allTasksWithSections().map(({ task, section }) => ({
    ID: task.taskId, Name: task.name, "Jira Ticket": task.jira || "", Workstream: workstreamForSectionName(section.name), Type: taskType(task), Release: task.release || "", Tags: normalizeTags(task.tags).join("; "),
    "Start (optional)": task.startDate || "", "Duration (work days)": task.durationDays, "Effort (days)": task.effortDays === "" ? "" : task.effortDays, "Calculated Start": task.dates?.[0] || "",
    "Calculated End": task.dates?.[1] || task.dates?.[0] || "", People: (task.owners || []).join("; ")
  }));
  const dependencies = allTasksWithSections().flatMap(({ task }) => (task.dependencies || []).map(dependency => ({ "Activity ID": task.taskId, "Depends On ID": dependency })));
  const teamRows = teams.map(team => ({ ID: team.id, Team: team.name, "Lead Member ID": team.leadMemberId || "", "Team Lead": teamMembers.find(member => member.id === team.leadMemberId)?.name || "" }));
  const members = teamMembers.map(member => ({ ID: member.id, Name: member.name, Team: member.team, Role: member.role || "" }));
  const leave = teamMembers.flatMap(member => (member.leave || []).map(period => ({ "Member ID": member.id, Name: member.name, From: period.from, To: period.to })));
  const overview = [["AI Platform FY27 Planner"], ["Exported", new Date().toISOString()], ["Activities", activities.length], ["Teams", teamRows.length], ["Team members", members.length], ["Leave periods", leave.length], [], ["Import guidance"], ["Keep sheet names and ID columns unchanged. Multiple people are separated with semicolons."]];
  const sheets = {
    Overview: XLSX.utils.aoa_to_sheet(overview), Activities: XLSX.utils.json_to_sheet(activities), Dependencies: XLSX.utils.json_to_sheet(dependencies),
    Teams: XLSX.utils.json_to_sheet(teamRows), "Team Members": XLSX.utils.json_to_sheet(members), Leave: XLSX.utils.json_to_sheet(leave)
  };
  const widths = { Overview: [30, 70], Activities: [20, 55, 18, 34, 16, 18, 18, 18, 22, 18, 18, 42], Dependencies: [24, 24], Teams: [28, 38, 28, 24], "Team Members": [28, 24, 38, 32], Leave: [28, 24, 16, 16] };
  for (const [name, sheet] of Object.entries(sheets)) {
    sheet["!cols"] = (widths[name] || []).map(width => ({ wch: width }));
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }
  XLSX.writeFile(workbook, "ai-platform-fy27-planner.xlsx");
}

async function importExcelPlan(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const rows = name => workbook.Sheets[name] ? XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: "" }) : [];
  const activities = rows("Activities");
  if (!activities.length) throw new Error("The workbook must contain a populated Activities sheet.");
  const dependencies = rows("Dependencies");
  const importedTeams = rows("Teams");
  const validImportedWorkstreams = importedTeams.length ? importedTeams.map(row => String(row.Team || "").trim()).filter(Boolean) : workstreamNames();
  const dependencyMap = new Map();
  for (const row of dependencies) {
    const id = String(row["Activity ID"] || "");
    if (!dependencyMap.has(id)) dependencyMap.set(id, []);
    if (row["Depends On ID"]) dependencyMap.get(id).push(String(row["Depends On ID"]));
  }
  const sections = new Map();
  for (const row of activities) {
    const requestedWorkstream = String(row.Workstream || "").trim();
    const sectionName = validImportedWorkstreams.includes(requestedWorkstream) ? requestedWorkstream : "Unassigned";
    if (!sections.has(sectionName)) sections.set(sectionName, { name: sectionName, tasks: [] });
    const type = String(row.Type || "activity").toLowerCase();
    const start = excelDate(row["Start (optional)"] ?? row.Start);
    const calculatedStart = excelDate(row["Calculated Start"] ?? row.Start);
    const calculatedEnd = excelDate(row["Calculated End"] ?? row.End) || calculatedStart;
    const importedDuration = Number(row["Duration (work days)"]);
    const importedEffortValue = row["Effort (days)"];
    const importedEffort = importedEffortValue === "" || importedEffortValue === null || importedEffortValue === undefined ? "" : Number(importedEffortValue);
    const task = {
      taskId: String(row.ID || `import-${Date.now().toString(36)}-${sections.get(sectionName).tasks.length}`), name: String(row.Name || "Untitled activity"), jira: String(row["Jira Ticket"] || "").trim(),
      startDate: start, durationDays: type === "milestone" ? 0 : Number.isFinite(importedDuration) && importedDuration > 0 ? Math.round(importedDuration) : workingDaysInclusive(calculatedStart, calculatedEnd),
      effortDays: Number.isFinite(importedEffort) && importedEffort >= 0 ? importedEffort : "",
      dates: type === "milestone" ? [calculatedStart] : [calculatedStart, calculatedEnd], modifiers: type === "milestone" ? ["milestone"] : type === "crit" ? ["crit"] : [],
      release: /^R[4-7]$/.test(String(row.Release)) ? String(row.Release) : "", tags: normalizeTags(row.Tags), owners: String(row.People || "").split(";").map(value => value.trim()).filter(Boolean),
      dependencies: dependencyMap.get(String(row.ID)) || []
    };
    sections.get(sectionName).tasks.push(task);
  }
  state.parsed.sections = [...sections.values()];
  const memberRows = rows("Team Members");
  if (memberRows.length) {
    const leaveRows = rows("Leave");
    teamMembers = memberRows.map(row => ({
      id: String(row.ID || `member-${Date.now().toString(36)}`), name: String(row.Name), team: String(row.Team), role: String(row.Role || "").trim(),
      leave: leaveRows.filter(item => String(item["Member ID"]) === String(row.ID)).map(item => ({ from: excelDate(item.From), to: excelDate(item.To) }))
    }));
  }
  if (importedTeams.length) {
    teams = importedTeams.map(row => ({ id: String(row.ID || `team-${Date.now().toString(36)}`), name: String(row.Team), leadMemberId: String(row["Lead Member ID"] || "") }));
  }
  normalizeWorkspace();
  refreshEditorsAndPlan({ resetPlanFilters: true });
}

function setActiveView(view) {
  const views = { timeline: "timelineView", activity: "activityView", teams: "teamsView", people: "peopleView" };
  const tabs = { timeline: "timelineTab", activity: "activityTab", teams: "teamsTab", people: "peopleTab" };
  if (!views[view]) return;
  state.activeView = view;
  for (const [key, panelId] of Object.entries(views)) {
    const isActive = key === view;
    document.getElementById(panelId).classList.toggle("hidden", !isActive);
    document.getElementById(tabs[key]).classList.toggle("is-active", isActive);
    document.getElementById(tabs[key]).setAttribute("aria-selected", String(isActive));
  }
  document.querySelector(".timeline-only").classList.toggle("hidden", view !== "timeline");
  if (view === "timeline") applyZoom();
  if (view === "activity") renderActivityEditor();
  if (view === "people") renderPeopleEditor();
  if (view === "teams") renderTeamsEditor();
}

function wireEvents() {
  document.getElementById("timelineTab").addEventListener("click", () => setActiveView("timeline"));
  document.getElementById("activityTab").addEventListener("click", () => setActiveView("activity"));
  document.getElementById("teamsTab").addEventListener("click", () => setActiveView("teams"));
  document.getElementById("peopleTab").addEventListener("click", () => setActiveView("people"));
  elements.taskSearch.addEventListener("input", event => { state.taskSearch = event.target.value; scheduleRender(); });
  elements.peopleSearch.addEventListener("input", event => { state.peopleSearch = event.target.value; renderPeopleFilters(); });
  elements.keepGates.addEventListener("change", event => { state.keepGates = event.target.checked; scheduleRender(); });
  document.getElementById("selectAllPeople").addEventListener("click", () => { state.selectedPeople = new Set(allPeople); renderPeopleFilters(); scheduleRender(); });
  document.getElementById("clearPeople").addEventListener("click", () => { state.selectedPeople.clear(); renderPeopleFilters(); scheduleRender(); });
  document.getElementById("selectAllWorkstreams").addEventListener("click", () => { state.selectedWorkstreams = new Set(workstreamNames()); renderWorkstreamFilters(); scheduleRender(); });
  document.getElementById("clearWorkstreams").addEventListener("click", () => { state.selectedWorkstreams.clear(); renderWorkstreamFilters(); scheduleRender(); });
  document.getElementById("selectAllTags").addEventListener("click", () => { state.selectedTags = new Set(allTags()); renderTagFilters(); scheduleRender(); });
  document.getElementById("clearTags").addEventListener("click", () => { state.selectedTags.clear(); renderTagFilters(); scheduleRender(); });
  document.getElementById("resetFilters").addEventListener("click", resetFilters);
  document.getElementById("emptyReset").addEventListener("click", resetFilters);
  document.getElementById("collapseFilters").addEventListener("click", () => document.querySelector(".app-shell").classList.toggle("filters-collapsed"));
  document.getElementById("exportButton").addEventListener("click", exportSvg);
  document.getElementById("zoomOut").addEventListener("click", () => { state.zoom = Math.max(.35, state.zoom - .1); applyZoom(); });
  document.getElementById("zoomIn").addEventListener("click", () => { state.zoom = Math.min(2, state.zoom + .1); applyZoom(); });
  document.getElementById("fitChart").addEventListener("click", () => {
    const svg = elements.chart.querySelector("svg");
    if (!svg) return;
    const naturalWidth = svg.viewBox?.baseVal?.width || 1600;
    state.zoom = Math.max(.35, Math.min(1, (elements.chartViewport.clientWidth - 30) / naturalWidth));
    applyZoom();
    elements.chartViewport.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  });
  elements.chartViewport.addEventListener("scroll", () => {
    syncReleaseRibbon();
    if (state.lastPointer) updateDateHover(state.lastPointer);
  }, { passive: true });
  elements.chartViewport.addEventListener("mousemove", event => {
    state.lastPointer = { clientX: event.clientX, clientY: event.clientY };
    updateDateHover(state.lastPointer);
  });
  elements.chartViewport.addEventListener("mouseleave", () => {
    state.lastPointer = null;
    elements.dateGuide.classList.add("hidden");
    elements.dateTooltip.classList.add("hidden");
  });
  window.addEventListener("resize", updateTimelineGeometry);
  elements.activityTableSearch.addEventListener("input", renderActivityEditor);
  elements.selectVisibleActivities.addEventListener("click", () => {
    const visibleIds = filteredActivityRows().map(({ task }) => task.taskId);
    visibleIds.forEach(id => state.selectedActivityIds.add(id));
    state.activitySelectionAnchor = visibleIds.at(-1) || "";
    elements.bulkActivityStatus.textContent = "";
    renderActivityEditor();
  });
  elements.applyBulkWorkstream.addEventListener("click", applyBulkActivityWorkstream);
  elements.applyBulkRelease.addEventListener("click", applyBulkActivityRelease);
  elements.applyBulkTags.addEventListener("click", applyBulkActivityTags);
  elements.clearActivitySelection.addEventListener("click", () => {
    state.selectedActivityIds.clear();
    state.activitySelectionAnchor = "";
    elements.bulkActivityStatus.textContent = "";
    renderActivityEditor();
  });
  elements.deleteSelectedActivities.addEventListener("click", deleteSelectedActivities);
  elements.peopleTableSearch.addEventListener("input", renderPeopleEditor);
  elements.teamsTableSearch.addEventListener("input", renderTeamsEditor);
  document.getElementById("addActivity").addEventListener("click", () => populateActivityDialog());
  document.getElementById("activityForm").addEventListener("submit", saveActivityFromForm);
  elements.activityTableBody.addEventListener("click", event => {
    const row = event.target.closest("tr[data-task-id]");
    if (!row) return;
    if (event.target.closest(".edit-task")) populateActivityDialog(row.dataset.taskId);
    else if (event.target.closest(".delete-task")) deleteActivity(row.dataset.taskId);
    else selectActivityRow(row.dataset.taskId, { extendRange: event.shiftKey, toggle: event.ctrlKey || event.metaKey });
  });
  elements.activityTableBody.addEventListener("keydown", event => {
    const row = event.target.closest("tr[data-task-id]");
    if (!row || event.target.closest("button")) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
      event.preventDefault();
      filteredActivityRows().forEach(({ task }) => state.selectedActivityIds.add(task.taskId));
      state.activitySelectionAnchor = row.dataset.taskId;
      elements.bulkActivityStatus.textContent = "";
      renderActivityEditor();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      state.selectedActivityIds.clear();
      state.activitySelectionAnchor = "";
      elements.bulkActivityStatus.textContent = "";
      renderActivityEditor();
      return;
    }
    if (!["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    selectActivityRow(row.dataset.taskId, { extendRange: event.shiftKey, toggle: event.ctrlKey || event.metaKey });
  });
  document.getElementById("addTeamMember").addEventListener("click", () => openMemberDialog());
  document.getElementById("addTeam").addEventListener("click", () => openTeamDialog());
  document.getElementById("memberForm").addEventListener("submit", saveMemberFromForm);
  document.getElementById("teamForm").addEventListener("submit", saveTeamFromForm);
  document.getElementById("leaveForm").addEventListener("submit", saveLeaveFromForm);
  document.getElementById("leaveFrom").addEventListener("input", syncLeaveDateBounds);
  document.getElementById("leaveFrom").addEventListener("change", syncLeaveDateBounds);
  elements.peopleTableBody.addEventListener("click", event => {
    const row = event.target.closest("tr[data-member-id]");
    if (!row) return;
    const memberId = row.dataset.memberId;
    if (event.target.closest(".add-leave")) openLeaveDialog(memberId);
    if (event.target.closest(".edit-member")) openMemberDialog(memberId);
    if (event.target.closest(".delete-member")) deleteMember(memberId);
    const editLeave = event.target.closest(".edit-leave");
    const deleteLeaveButton = event.target.closest(".delete-leave");
    if (editLeave) openLeaveDialog(memberId, editLeave.dataset.leaveIndex);
    if (deleteLeaveButton) deleteLeave(memberId, Number(deleteLeaveButton.dataset.leaveIndex));
  });
  elements.teamsTableBody.addEventListener("click", event => {
    const row = event.target.closest("tr[data-team-id]");
    if (!row) return;
    if (event.target.closest(".edit-team")) openTeamDialog(row.dataset.teamId);
    if (event.target.closest(".delete-team")) deleteTeam(row.dataset.teamId);
  });
  document.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", () => {
    document.getElementById(button.dataset.closeDialog).close();
  }));
  document.getElementById("exportMarkdown").addEventListener("click", exportMarkdownPlan);
  document.getElementById("exportExcel").addEventListener("click", exportExcelPlan);
  document.getElementById("importMarkdown").addEventListener("click", () => document.getElementById("markdownFileInput").click());
  document.getElementById("importExcel").addEventListener("click", () => document.getElementById("excelFileInput").click());
  document.getElementById("importFeatures").addEventListener("click", () => document.getElementById("featuresFileInput").click());
  document.getElementById("markdownFileInput").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { await importMarkdownPlan(file); } catch (error) { alert(`Markdown import failed: ${error.message}`); }
    event.target.value = "";
  });
  document.getElementById("excelFileInput").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { await importExcelPlan(file); } catch (error) { alert(`Excel import failed: ${error.message}`); }
    event.target.value = "";
  });
  document.getElementById("featuresFileInput").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { await importFeatures(file); } catch (error) { alert(`Feature import failed: ${error.message}`); }
    event.target.value = "";
  });
  document.getElementById("activityType").addEventListener("change", event => {
    const duration = document.getElementById("activityDuration");
    const isMilestone = event.target.value === "milestone";
    duration.disabled = isMilestone;
    duration.min = isMilestone ? "0" : "1";
    if (isMilestone) duration.value = "0";
    else if (Number(duration.value) < 1) duration.value = "1";
  });
}

async function init() {
  wireEvents();
  try {
    const response = await fetch(SOURCE_PLAN, { cache: "no-store" });
    if (!response.ok) throw new Error(`Source plan returned ${response.status}`);
    const markdown = await response.text();
    const block = markdown.match(/```mermaid\s*([\s\S]*?)```/i);
    state.source = (block ? block[1] : markdown).trim();
    if (!state.source) throw new Error("The Mermaid source plan is empty");
    state.parsed = parseSource(state.source);
    const dataBlock = markdown.match(/```json\s*([\s\S]*?)```/i);
    if (dataBlock) {
      const sourceData = JSON.parse(dataBlock[1]);
      if (!sourceData?.sections?.length) throw new Error("The source plan's Planner data block is invalid");
      state.parsed.sections = sourceData.sections;
    }
    loadStoredWorkspace();
    await mergeSourceActivityData();
    normalizeWorkspace();
    rebuildPeopleIndex();
    saveWorkspace();
    state.selectedPeople = new Set(allPeople);
    state.selectedWorkstreams = new Set(workstreamNames());
    state.selectedTags.clear();
    renderPeopleFilters();
    renderReleaseFilters();
    renderWorkstreamFilters();
    renderTagFilters();
    renderActivityEditor();
    renderPeopleEditor();
    renderTeamsEditor();
    await renderChart();
  } catch (error) {
    elements.loadingState.querySelector("strong").textContent = "Unable to load the source plan";
    elements.loadingState.querySelector("span").textContent = "Open this page through a local web server using the included launch script.";
    elements.renderStatus.textContent = error.message;
    console.error(error);
  }
}

init();
