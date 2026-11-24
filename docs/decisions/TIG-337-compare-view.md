# TIG-337: side-by-side compare view (decision log)

Branch: `tig-337-tigerpath-side-by-side-parallel-view-for-comparing`. It's stacked on TIG-330
(`tig-330-tigerpath-implement-lucys-color-gradient-ui-on-the`), as the issue asks ("start it after TIG-330"),
so the compare boards use the gradient tokens.

## What ships

- **Backend:** `GET /api/v1/get_schedule/?planId=` and `GET /api/v1/get_requirements/?planId=` read any of
  the user's own plans. Without `planId` they behave exactly as before (active plan). A plan id that is
  missing, malformed or belongs to someone else returns 404. Neither read changes the active plan or writes anything.
- **`usePlanner`:** `comparePlanId` plus `compareSchedule`/`compareRequirements`, loaded through those
  GETs only. Stale responses are dropped when the user switches quickly.
- **UI:** a **Compare** button next to the plan tabs opens a "Compare with" picker. The active plan is
  editable on the left; the compared plan is read-only on the right. Each side shows a compact
  requirement summary for every major and minor on that plan. Below 1100px it's one board at a time,
  with a toggle between the two plans.

## Checks from the issue

| Check | How it's covered |
|---|---|
| Plans with different `additional_major_ids` each show their own requirements | `ComparePlanApiTest.test_each_plan_reports_its_own_majors`. Preview: plan b has two majors (SPI and POL). |
| Opening or closing compare never changes the active plan or writes a schedule | `test_compare_reads_never_change_active_plan_or_write` (plans' `schedule` and `updated_at` unchanged). Preview: zero non-GET requests across open, switch and close. |
| Selecting the same plan twice is blocked | The picker never lists the active plan (`compareOptions`, unit-tested); `setComparePlanId` refuses it as well. |
| Screenshots at 1440px and 1100px | In the PR. |

## Decisions

### D1. A read-only `planId` on the existing GETs, not a new endpoint

**Blocker:** both endpoints only ever returned the active plan (`get_active_plan`).
**Decision:** add an optional `planId` to the two existing GET views, scoped to `profile.schedule_plans`.
It's honored on GET only, so `update_schedule_and_get_requirements` (POST, which reuses
`get_requirements`) always answers for the active plan it just saved. Tested.
*Other option:* a separate `get_plan_snapshot` endpoint. That's more surface area for the same data.

### D2. The Figma has no finished side-by-side design

The file's only compare artifact is Angelina's low-fidelity grey "STEP 2: COMPARE" wireframe: two
halves, each with a majors/minors box. **Decision:** follow the issue's behavior spec and the existing new-planner
visual language (gradient tokens, plan-tab styling). Lucy should review the layout (see the PR).

### D3. Compare layout: two boards plus compact summaries; search and the full requirements panel are hidden

At 1440px a search column, two boards and two full `RequirementsPanel`s don't fit. Each board would be about 360px,
which truncates every course code. **Decision:** while comparing, the two boards take the full width (about 680px
each, close to the normal board), and each side gets a compact per-major/minor summary (the issue's
"compact per-major summary" fallback). Search, settling and external credits need the full panel,
so close compare to use them. Moving and removing courses on the left still works.
*Other option:* keep `RequirementsPanel` per side and drop the search column only. That's still too narrow at 1440px.

### D4. The read-only board renders without drag-and-drop

Both boards sit inside one `DragDropContext`. Reusing `Droppable`/`Draggable` on the right would duplicate the
`sem0`…`sem7` droppable ids. `Board readOnly` renders static markup instead: no remove button, no
grab cursor, no hover gradient, and no `#semesters` id (the tutorial targets the left board's).

### D5. Clicking the compared plan's tab swaps the sides

Making the compared plan active would otherwise put the same plan on both sides. **Decision:** the
previously active plan moves to the compare side. This is the only compare-related flow that writes,
because the user explicitly chose a new active plan (`set_active_plan`). It's the same request as clicking any tab.

### D6. Compare state isn't persisted

Compare closes on reload. Persisting it would mean a write (`user_state`) when opening compare, and
the issue says opening and closing compare must not write.

### D7. Summary text stays at WCAG AA

The summary's "x/y complete" count and the "not supported yet" label use the text color, because the existing
muted grey (4.31:1) and incomplete red (4.06:1) fall just under 4.5:1 on the tinted requirement card. Colored
dots carry each requirement's done/incomplete status.
*Not changed:* the existing full requirements panel still shows its red count on white (4.27:1). Flagged for follow-up.

### D8. The tutorial closes compare first

The tour highlights the search pane and requirements panel, which compare mode hides.

### D9. Print shows the active plan only

The compare side and the summaries are `dont-print`. The printout stays "My Four Year Schedule: <active plan>".
