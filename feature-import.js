function featureCell(row, candidates) {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [String(key).trim().toLowerCase().replace(/[\s_-]+/g, ""), value]));
  for (const candidate of candidates) {
    const value = normalized.get(candidate.toLowerCase().replace(/[\s_-]+/g, ""));
    if (value !== undefined) return value;
  }
  return "";
}

function jiraIdentity(value) {
  const text = String(value || "").trim();
  const ticket = text.match(/\bFDAP-\d+\b/i);
  return (ticket?.[0] || text).toLowerCase();
}

function featureIdentity(name, jira) {
  const normalizedName = String(name || "").trim().replace(/\s+/g, " ").toLowerCase();
  return `${normalizedName}\u001f${jiraIdentity(jira)}`;
}

function featureIdStem(name, jira) {
  const composite = `${String(name || "").trim()}-${jiraIdentity(jira) || "no-jira"}`;
  return composite.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "activity-no-jira";
}

export function upsertFeatureRows(rows, sections) {
  const importedSectionName = "Unassigned";
  let importedSection = sections.find(section => section.name === importedSectionName);
  const existingRecords = sections.flatMap(section => (section.tasks || []).map(task => ({ task, section })));
  const existingIds = new Set(existingRecords.map(({ task }) => task.taskId));
  const recordsByIdentity = new Map();
  for (const record of existingRecords) {
    const key = featureIdentity(record.task.name, record.task.jira);
    if (!recordsByIdentity.has(key)) recordsByIdentity.set(key, record);
  }
  const createdIds = new Set();
  const updatedIds = new Set();
  let skipped = 0;

  for (const row of rows) {
    const name = String(featureCell(row, ["name", "feature", "feature name"])).trim();
    const jira = String(featureCell(row, ["jira_id", "jira id", "jira", "jira ticket"])).trim();
    const pointsValue = featureCell(row, ["points", "point", "effort", "effort days"]);
    const points = pointsValue === "" || pointsValue === null || pointsValue === undefined ? "" : Number(pointsValue);
    if (!name) {
      skipped += 1;
      continue;
    }

    const effortDays = Number.isFinite(points) && points >= 0 ? points : "";
    const identityKey = featureIdentity(name, jira);
    const existing = recordsByIdentity.get(identityKey);
    if (existing) {
      existing.task.name = name;
      if (jira) existing.task.jira = jira;
      existing.task.effortDays = effortDays;
      recordsByIdentity.set(identityKey, existing);
      if (!createdIds.has(existing.task.taskId)) updatedIds.add(existing.task.taskId);
      continue;
    }

    if (!importedSection) {
      importedSection = { name: importedSectionName, tasks: [] };
      sections.push(importedSection);
    }
    const idStem = featureIdStem(name, jira);
    let taskId = `feature-${idStem}`;
    let suffix = 2;
    while (existingIds.has(taskId)) taskId = `feature-${idStem}-${suffix++}`;
    existingIds.add(taskId);
    const durationDays = effortDays === "" ? 10 : Math.max(1, Math.round(effortDays));
    const importedTask = {
      name,
      jira,
      taskId,
      startDate: "",
      durationDays,
      effortDays,
      dates: [],
      modifiers: [],
      release: "",
      tags: [],
      owners: [],
      dependencies: [],
      metadata: taskId,
      raw: `    ${name} :${taskId}`
    };
    importedSection.tasks.push(importedTask);
    const importedRecord = { task: importedTask, section: importedSection };
    recordsByIdentity.set(identityKey, importedRecord);
    createdIds.add(taskId);
  }

  return { created: createdIds.size, updated: updatedIds.size, skipped };
}
