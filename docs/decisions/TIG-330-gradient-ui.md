# TIG-330: color-gradient UI on the new planner (decision log)

Issues: TIG-330 (parent), TIG-335 (audit), TIG-336 (implementation).
Design source: Figma file `parallel`. Purple is Anna › `purple (default)` (node `2027:3157`) and pink is
Angelina › node `447:2`, both confirmed by Helen.

Each decision below records the options, what this branch does, and which branch holds the other
option, so you can switch with `git switch <branch>`.

| Branch | What it changes |
|---|---|
| `tig-330-tigerpath-implement-lucys-color-gradient-ui-on-the` | **Main branch.** Every decision uses its default (D1–D9). |
| `tig-330-alt-figma-exact-text` | D4 alternative: Lucy's exact text colors, which fail WCAG AA. |
| `tig-330-alt-shared-tokens` | D1 alternative: the classic UI adopts the new palette too. |

## D1. Classic UI isolation: new tokens, not edited ones

**Blocker:** TIG-336 says the classic UI must stay visually unchanged. Every existing CSS variable
(`--tp-course-*`, `--tp-search-*`, `--tp-requirement-*`, `--tp-active-plan-*`, `--tp-accent`) is also
read by the classic UI (`styles/Courses.css`, `styles/Requirements.css`, `components/PlanHeader.jsx`).
Changing their values would recolor the classic UI.

**Decision:** leave every existing key and value alone, and add new keys to each theme in
`TIGERPATH_THEME_OPTIONS`, named `<surface>FillStart/End` as TIG-336 asks. `getTigerPathThemeVariables()`
emits them as `--tp-<surface>-fill-start/end`.
`theme.test.js` pins the classic purple values so they can't drift by accident.

New tokens: `courseCardFill*`, `courseCardHoverFill*`, `searchCardFill*`, `searchCodeFill*`,
`reqChipFill*`, `courseCardText`, `reqChipText`, `planTabActiveFill`, `planTabsFill`, `reqPanelFill`.

**Other option:** `tig-330-alt-shared-tokens` points the existing keys at the new values too. That
gives one palette for both UIs, but the classic UI changes.

## D2. Orange and blue have no Figma

**Blocker:** the Figma only has purple and pink.

**Decision (Helen: "extrapolate from existing"):** each themed color uses that theme's existing hue in
`theme.js`, with saturation and lightness averaged from Figma's purple and pink. Green and neutral surfaces
(requirement chip, active plan tab, tab bar, requirement panel) follow warm and cool: orange copies
pink and blue copies purple. Blue's requirement panel gets a blue tint (`#f8feff`).

## D3. The darker course card in the Figma is the hover state

**Blocker:** the Figma doesn't say what the darker ECO100 card (with the ×) represents.

**Decision (Helen):** it's hover. `.tp-course:hover` and `:focus-visible` switch to the
`courseCardHoverFill*` gradient. The existing × still shows on hover.

## D4. WCAG AA beats exact Figma text colors

**Blocker:** TIG-330 requires text on gradients to meet WCAG AA (4.5:1). Lucy's text colors fail on
the hover card (purple 3.78, pink 3.68), the search course-code pill (purple 4.45, pink 3.68) and the
requirement chip (purple 2.65, pink 3.28).

**Decision:** keep every gradient as designed and darken only the two text colors. Each keeps its hue
and saturation, with lightness lowered to the lightest value that clears 4.5:1 on every stop it sits on.

| Token | Purple | Orange | Blue | Pink |
|---|---|---|---|---|
| `courseCardText` | `#42116f` (Figma `#54168e`) | `#922310` | `#0b6875` | `#970c48` (Figma `#b30e55`) |
| `reqChipText` | `#0b7a2c` (Figma `#0fa93d`) | `#597112` | `#0b7a2c` | `#597112` (Figma `#6e8b16`) |

`theme.test.js` checks every text/stop pair for every theme.

**Other option:** `tig-330-alt-figma-exact-text` uses Lucy's exact colors (its AA test is marked as
an expected failure). Use it if Lucy would rather fix contrast in the design.

## D5. Requirement chip direction: `to bottom`

The Figma gradients are all vertical. The existing chip was drawn `to right`. It's now `to bottom`.

## D6. Active plan tab keeps its theme-colored border

The Figma active tab is lime (`#dcfdad` purple, `#ecf9a5` pink) with no border. TIG-336 also says the
active tab must stay easy to tell apart. **Decision:** lime fill from the Figma, and keep the existing
`--tp-active-plan-border` outline, so the active tab still reads clearly against the grey bar and
still shows the theme.

## D7. Duplicate color tokens removed from `new/styles.css`

`new/styles.css :root` had its own copies of `--tp-text`, `--tp-border`, `--tp-muted`,
`--tp-drop-ok`, `--tp-drop-warn` and `--tp-incomplete`. They now come from `BASE_THEME` through
`getTigerPathThemeVariables()`, and `:root` keeps only the layout tokens (`--tp-header-h`, `--tp-radius`).
`app-style.css :root` (the classic fallback) is **left alone** to keep the classic first paint unchanged.

## D8. No unthemed first paint

Every new-planner color is now a runtime variable, so `new/main.jsx` calls
`applyTigerPathTheme(getStoredTigerPathTheme())` before the first render. The last theme is kept in
`localStorage` (`tigerpath-theme`) and falls back to purple. `App` re-applies the profile's theme once
it loads.

## D9. Print uses flat fills

`@media print` swaps every gradient for its end stop (course card, search card, code pill, requirement
chip) and keeps the requirement panel white. Print text stays black via the existing `* { color: #000 }`.

## Not changed (out of scope, recorded for follow-up)

- Semester and year headers: no fill in the Figma, so no tokens.
- `.tp-chip` (blue, `#e2f1ff`/`#10508a`), `.tp-btn-save`, `.tp-btn-danger`, notice yellows: off-palette
  but not part of the gradient design.
- The settings-modal theme swatches still use the classic `courseFill`, `fallSemHeaderColor` and `accent`.
- The landing-page gradient: a single design, outside the theme system.
