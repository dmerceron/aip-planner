# AI Platform FY27 planner instructions

These instructions apply to every file in this workspace.

## Purpose

Maintain the detailed AI Platform FY27 delivery plan for 03 August 2026 through 30 June 2027. The plan is an editable planning application, not just a static Mermaid diagram. Any change must preserve activities, milestones, dependencies, releases, effort, teams, people, roles and leave.

## Primary files

- `gantt-viewer.html` contains the planner UI and editors.
- `gantt-viewer.js` contains the saved-data schema, scheduling rules, filters, imports and exports.
- `feature-import.js` contains the pure prioritisation-feature upsert and duplicate-prevention rules.
- `gantt-viewer.css` contains the planner presentation.
- `ai-platform-fy27-detailed-gantt.mmd` contains the complete baseline Mermaid source loaded on first use. It contains Mermaid syntax only: no Markdown fences, prose, comments outside Mermaid syntax, or planner JSON.
- `ai-platform-fy27-activity-data.json` contains revisioned activity-list additions that must remain unscheduled until the user plans them. Loading a new revision merges by normalized `(name, jira)` without deleting or duplicating existing activities; once merged, user edits and deletions remain authoritative.
- `ai-platform-fy27-detailed-gantt.md` is a preserved legacy Markdown copy and is not the tool's active source.
- `r4-uploaded-features-plan.md` is a preserved release-planning reference only. It must never replace the complete activity dataset or introduce its temporary wave groupings into the main tool.
- `open-gantt-viewer.ps1` serves the planner locally.

## Source of truth and saved data

### Non-deletion invariant

- Never delete, remove, replace, prune or omit activities from the planner's activity list as part of code generation, plan regeneration, imports, migrations, release planning, filtering or source-file updates.
- Only the user may delete activities, using the planner application's visible delete controls and confirmation flow.
- Creating or updating a release Gantt changes scheduling fields for existing activities and may change which activities are displayed by a filter; it must not replace the complete saved activity dataset with a release-only subset.
- Before saving or migrating planner data, compare activity counts and stable `taskId` values. If any existing activity would disappear, stop without writing the change and report the conflict to the user.
- Imports are additive or update matching activities in place. They must never remove activities that are absent from the imported file.

1. Prefer the latest user-exported editable Markdown file because its `Planner data` JSON block contains the complete model.
2. If the live browser contains newer edits, preserve the complete saved activity collection. Browser workspaces currently include `ai-platform-r4-uploaded-planner-v1` and the legacy `ai-platform-fy27-planner-v1`; do not assume a release-only workspace is more complete because it is newer.
3. Never promote a release-only source or workspace over a fuller activity dataset. Merge release scheduling into matching activities while retaining every other existing activity, team, person, role and leave record.
4. Before editing, inventory the existing sections, tasks, teams and people. Preserve unknown fields for forward compatibility.

## Planner data schema

The current exported schema version is 6.

### Activities and milestones

Each item belongs to a section/workstream and may contain:

- The only business identity and duplicate key for an activity is the normalized pair `(name, jira)`. Never use Jira alone, a spreadsheet/source ID, or any other field as the unique key.
- `taskId`: hidden stable technical identifier used by dependencies. Generate it for new activities from the `(name, jira)` pair, never display it as a subtitle, and never rewrite an existing value because saved dependencies may reference it.
- `name`: activity or milestone name.
- `priority`: optional free-text priority or prioritisation note. Preserve values such as `H`, `M`, `L`, or a longer supplied priority description.
- `sponsor`: optional free-text sponsor.
- `jira`: optional Jira ticket ID or URL. Preserve the stored value, but display only the extracted `FDAP-12345` key in activity tables when present.
- `startDate`: optional explicit ISO date (`YYYY-MM-DD`).
- `durationDays`: scheduled elapsed working days. Saturday and Sunday are non-working days.
- `effortDays`: optional person-days of effort. Effort and duration are independent; changing one must not silently change the other.
- `dates`: calculated start/end dates used by Mermaid.
- `modifiers`: `milestone`, `crit`, or other supported Mermaid modifiers.
- `release`: `R4`, `R5`, `R6`, `R7`, or the empty string `""` when no release is allocated. Display and export an unallocated release as blank; never label it `Cross-release`.
- `tags`: zero or more user-defined tag strings. Normalize whitespace, remove case-insensitive duplicates, keep every tag list in case-insensitive alphabetical order, and preserve tags through browser persistence and Markdown/Excel round-trips. For a bulk selection, show the intersection of tags common to every selected activity. Submitting the edited field replaces only that common subset on each selected activity: tags that were not common to the selection must remain on their original activities. Submitting the field empty removes only the previously common tags. Timeline tag filters are generated only from tags present on saved activities and match an activity when it has any selected tag.
- `owners`: zero or more person names.
- `dependencies`: zero or more stable `taskId` values.

The Excel `Activities` sheet exports and imports the columns `ID`, `Name`, `Priority`, `Sponsor`, `Jira Ticket`, `Workstream`, `Type`, `Release`, `Tags`, `Start (optional)`, `Duration (work days)`, `Effort (days)`, `Calculated Start`, `Calculated End` and `People`. `Calculated Start` and `Calculated End` are derived schedule values: display and export them, but calculate them from the explicit start, duration and dependencies after import. Excel imports update matching activities by normalized `(name, jira)` and add unmatched activities; they must not delete activities that are not present in the workbook.

If an item has no explicit start date, it starts on the earliest working day after all dependencies finish. An item with neither a start date nor dependencies remains unscheduled, stays in saved planner JSON, and is omitted from the rendered/exported Mermaid block until it is planned.

### Teams

Each team contains `id`, `name` and optional `leadMemberId`. The lead must be a current member of that team. Deleting a team keeps its people and sets their `team` value to blank (`No team`).

The saved `teams` collection is also the sole source of truth for workstreams. Every workstream filter, activity workstream selector, timeline workstream section and Excel workstream value must be derived from these saved records. Never infer or create workstreams from Mermaid section names, activity owners, imports or portfolio structures. `Portfolio gates` is a special milestone structure controlled by its own toggle and is never a workstream. Activities whose stored section does not match a saved workstream display a blank workstream and remain saved until the user assigns one.

### People

Each person contains `id`, `name`, `team`, optional `role`, optional `type`, optional `capacityGrouping`, `platformFte`, optional `fteCount`, and a `leave` array. `platformFte` is `true`, `false`, or blank when not recorded; `fteCount` is blank or a non-negative number and may be fractional (for example `0.5`). A person may have no team. Each leave entry contains inclusive `from` and `to` ISO dates, and a person may have multiple leave periods. Preserve all of these fields through browser persistence, Markdown and the Excel `Team Members` sheet. Excel displays Platform FTE as `Yes`, `No`, or blank and imports the legacy/misspelled headers `Platform FTE Count` and `Platfrom FTE Count` for compatibility.

### Imported prioritisation features

The prioritisation workbook uses a sheet named `Features`. Map `name` to activity name, `jira_id` to Jira, and `points` to `effortDays`. New records have a blank workstream and remain unscheduled until planned; imports must never invent a workstream. The normalized combination `(name, jira_id)` is the identity key: re-importing the same pair updates its activity and must never create a duplicate. The same Jira with a different name, or the same name with a different Jira, is a distinct feature. Within the composite key, treat a Jira URL containing `FDAP-12345` and the short value `FDAP-12345` as the same Jira value, while preserving the original stored value. Preserve any separately edited duration, dates, owners, release, tags and dependencies when refreshing effort.

## Mermaid and release rules

- Keep the plan bounded to 2026-08-03 through 2027-06-30.
- R4 is green, R5 blue, R6 orange and R7 purple.
- An activity allocated to a release keeps that release colour even if its dates extend beyond the release delivery window.
- Only genuinely cross-release activities are split into one rendered segment per release window they cover.
- Keep milestone and dependency IDs stable when regenerating Mermaid.
- Do not re-scale the calendar when filters hide activities or releases.
- The release ribbon must remain aligned with the chart plot and horizontal scroll position.

## Safe editing workflow

1. Read the current saved model before editing.
2. Make the smallest compatible schema/UI change.
3. Run normalization so older saved data gains defaults without losing information.
4. Update browser persistence, editable Markdown import/export and Excel import/export together whenever the schema changes.
5. Keep Excel sheet names and ID columns stable. The planner workbook uses `Activities`, `Dependencies`, `Teams`, `Team Members` and `Leave`; feature import separately reads `Features`.
6. Verify add/edit/delete, reload persistence, duplicate prevention and relevant filters in `http://127.0.0.1:8765/gantt-viewer.html`.
7. Check the browser console for errors and leave no temporary QA records in saved data.

## Activity bulk editing

- Activity-table columns sort independently in ascending/descending order without changing saved activity order. Double-clicking a single-value cell supports inline editing for Name, Priority, Sponsor, Jira, Workstream, Release, Tags, Start, Duration and Effort. People, Dependencies and calculated End open the full activity editor because they require multi-value or derived scheduling controls.
- Bulk Priority, Sponsor and Effort set the entered value on every selected activity; deliberately submitting an empty value clears that field. Bulk Effort accepts zero or a positive number of person-days and must not change duration. Bulk Duration accepts at least one whole working day and must not change effort; its value is required, and milestones keep their zero-day duration. The bulk **People** picker displays only people shared by every selected activity as initially selected. Submitting it replaces only that common subset on each selected activity: activity-specific people remain allocated, while shared people can be added or removed. The People cell's inline editor is a picker populated from the saved people list.
- The Activity editor uses Microsoft-style row selection with no row checkboxes: click starts a new selection, Ctrl/Command-click toggles rows, every Shift-click adds the visible range from the current anchor without clearing earlier selections, Ctrl/Command+A selects all shown rows, and Escape clears the selection. **Select all shown** provides the same visible-row selection without a keyboard shortcut.
- Bulk release assignment changes only the `release` field and must preserve dates, duration, effort, owners and dependencies.
- Bulk workstream assignment moves only the selected activity objects into the chosen user-defined workstream (or `No workstream`) and must preserve their IDs, dates, duration, effort, release, tags, owners and dependencies. Its selector must be populated only from saved `teams` records.
- Bulk deletion requires confirmation. Remove deleted task IDs from every remaining dependency list and preserve the dependent task's calculated start as an explicit start when needed, matching single-activity deletion behaviour.
- Selection is transient interface state and must not be written into exported planner data.

Run the app from this directory with:

```powershell
.\open-gantt-viewer.ps1
```

Do not discard unrelated user changes, reset the workspace, or rewrite saved planning data from assumptions.
