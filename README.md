# AI Platform FY27 Planner

Browser-based planning tool for the AI Platform FY27 delivery plan, covering 3 August 2026 to 30 June 2027.

## Run locally

From PowerShell:

```powershell
.\open-gantt-viewer.ps1
```

The launcher starts a local Python web server and opens:

```text
http://127.0.0.1:8765/gantt-viewer.html
```

Python must be available on `PATH`.

## Planner capabilities

- Filterable delivery timeline with release colours and workstream, people, release and tag filters.
- Activity and milestone editing, including Jira, effort, duration, owners, dependencies, releases, tags and bulk updates.
- User-defined workstreams, team leads, people, roles and multiple leave periods.
- Working-day scheduling with dependency-based automatic starts.
- Editable Markdown and Excel import/export.
- Prioritisation feature import with duplicate prevention based on `(activity name, Jira ID)`.

## Data files

- `ai-platform-fy27-detailed-gantt.mmd` — baseline Mermaid Gantt source.
- `ai-platform-fy27-activity-data.json` — revisioned, unscheduled activity additions merged into the planner without deleting existing activities.
- `ai-platform-fy27-detailed-gantt.md` — preserved legacy Markdown copy.
- `r4-uploaded-features-plan.md` — preserved R4 planning reference.

Planner edits are automatically retained in browser storage. Use **Save Markdown** or **Export Excel** to create portable backups of the complete editable model.

## Project guidance

See `AGENTS.md` for the data-preservation rules, schema conventions and safe editing workflow used when maintaining the planner.
