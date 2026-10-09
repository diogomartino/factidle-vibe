# Factidle

An incremental factory game: Factorio's production chain, from a burner drill to a rocket launch, as a browser idle game. Proof of concept; icons are hotlinked from the [Factorio wiki](https://wiki.factorio.com).

## Setup

```sh
bun install
bun run dev        # http://localhost:5173
```

| Script              | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `bun run dev`       | Vite dev server (debug panel available)        |
| `bun run typecheck` | `tsc -b` in strict mode                        |
| `bun run lint`      | oxlint, warnings fail                          |
| `bun run test`      | Vitest: engine, persistence, formatting        |
| `bun run build`     | Typecheck + production build into `dist/`      |
| `bun run check`     | All of the above in order                      |

## Gameplay loop

1. You start with Factorio's kit: 1 burner mining drill, 1 stone furnace, 8 iron plates.
2. Mine coal by hand (click, or hold for 2/s), then point the drill at coal and iron ore.
3. Smelt plates, craft gears, pipes and cables, and build more drills and furnaces.
4. Progression follows Factorio 2.0's tech tree. The first three techs are **trigger technologies**: they complete as soon as you produce something.
   - *Steam power*: produce 50 iron plates. Unlocks pipes, offshore pump, boiler and steam engine.
   - *Electronics*: produce 10 copper plates. Unlocks cables, circuits, inserters and the lab.
   - *Automation science pack*: build a lab.
5. Build steam power and labs, then follow Factorio 2.0's tech tree through the five science packs:

   | Stage | Packs | Highlights |
   | --- | --- | --- |
   | Early | red | assembler, electric drill, steel (and the steel chest), green science |
   | Pre-oil | red + green | assembler 2, engine units, solar panels, lab speed, storage tanks, pumpjacks, concrete, rails |
   | Oil | red + green | refinery and chemical plant, plastic, sulfur, advanced circuits, batteries, accumulators, tier 1 modules, mining productivity, blue science |
   | Blue | + blue | advanced oil processing and cracking, lubricant, electric engines, processing units, low density structures, rocket fuel, electric furnace, tier 2 modules, purple and yellow science |
   | Endgame | + purple, yellow | assembler 3, tier 3 modules, more lab speed and mining productivity, the rocket silo |

   Costs, prerequisites and recipes come from Factorio 2.0's base game data. Techs that only unlock content an idle game has no use for (belts, poles, radar, combat, trains, robots) are left out, and their prerequisites are folded into the techs that needed them. The *Steel axe* (produce 50 steel) doubles manual mining.

   The Research tab has a Factorio-style queue: queueing a tech also queues its missing prerequisites, and removing a tech also removes the techs that depend on it. The top bar shows the current research (progress, time left, and a ⚠ when labs are slowed) or the next goal.
6. Automate science with assemblers. Labs are ordinary machines in the simulation, so missing packs or low power slow research exactly like any other bottleneck.
7. **Launch a rocket to win.** The silo builds 100 rocket parts (10 processing units, 10 low density structures and 10 rocket fuel each) and launches automatically. The first launch shows the victory screen; you can keep playing.

Every machine type has an owned count, an on/off toggle, a priority (-5 to 5), and a **running %** set in its settings popover. Running % is rounded to whole machines: 50% of 100 smelters runs exactly 50, and the idle ones use no fuel or power. For assemblers, running machines go to the assigned recipes in whole machines first; any free ones are the ones left idle.

- **Drills and furnaces** split their capacity between recipes by percentage, at most 100% in total; the rest sits idle and uses no fuel.
- **Refineries and chemical plants** are assigned to recipes as whole machines, on their cards in the Oil tab.
- **Assemblers** are assigned as whole machines per product, like placing one in Factorio and setting its recipe. The Products tab is one table with these columns:
  - stock;
  - cost;
  - assemblers assigned (− n +);
  - actual / max output;
  - a **keep-in-stock** target, where assemblers pause once storage holds that many;
  - hand crafting.
  Stock targets are part of the simulation: they work like a lower storage cap for machine output, and a paused machine shows "Stock target reached" instead of a bottleneck.
  With several assembler tiers there is one stepper per tier. As in Factorio, engine units need an assembler, and recipes with fluids (processing units, electric engines, rocket fuel, concrete) need assembler 2 or 3. Assemblers can also make **buildings into storage**, e.g. electric furnaces for production science; a card's Build button places stored buildings before crafting new ones.

**Modules** are installed from storage in a machine's settings popover. They're shared by every machine of that type, so their effect is averaged: 3 speed modules on 3 drills act like one per drill. The Factorio 2.0 values apply (e.g. speed module +20% speed and +50% energy), productivity never applies to buildings, and speed and energy penalties stop at -80%. Research adds *mining productivity* (+10% per level, drills and pumpjacks) and *lab research speed*.

**Power.** Solar panels give 60 kW at noon and nothing at night, on Nauvis' 6.9-minute day (70% on average). The top bar draws the day's light curve with a marker for the current time. The grid uses solar first, then steam. Accumulators (5 MJ, 300 kW each) charge only from spare power, steam included, and cover shortfalls.

**Oil.** Crude oil, petroleum gas, light and heavy oil, lubricant and sulfuric acid are stored like items, but in fluid storage: 1,000 units each, plus 25,000 per storage tank. Advanced oil processing makes all three oils, so it stalls when any of them fills up, as in Factorio: crack heavy and light oil or turn them into lubricant and solid fuel. Pumpjacks yield 10 crude oil/s each (a 100% field).

**Combat** (`engine/combat.ts`, Factorio 2.0 values). Machines emit pollution as they use energy (boilers 30/min, burner drills 12/min, solar none). The land absorbs 180/min. Above that, a cloud builds up and drifts towards the biter nests: the top bar and the radar's haze show how close it is, and attacks start only once it reaches them (a 1,000 cloud), giving minutes of warning. Nests then absorb 1% of the cloud beyond that per second to send a constant stream of attackers, but only while you pollute more than the land absorbs: cutting back below the line ends the attacks. The mix of small, medium, big and behemoth biters follows evolution, which rises with time and with pollution produced.
- **Turrets** produce *firepower* in the solver and are demand-driven like steam engines: they only shoot, and use magazines or power, when biters arrive.
  - Gun turrets fire 10 shots/s; each shot uses a tenth of a magazine.
  - Laser turrets fire 1.5 shots/s at 800 kJ per shot.
  - Damage per shot accounts for overkill and Factorio's flat resistances, so yellow ammo barely scratches medium biters.
- **Damage taken:** each biter that gets through bites 10 times. Walls (350 HP) absorb hits first, and repair packs patch walls, then buildings (300 HP per pack, up to 120 HP/s). After the walls, biters destroy the building type polluting the most, at most one every 10 s, so an idle player never comes back to nothing.
- **Research:** military techs, plus damage and shooting-speed upgrades, use military (black) science.
- **Shooting by hand** stands in for Factorio's pistol before turrets: click or hold on the radar (or press Shoot). Each shot spends a magazine, piercing rounds when you have them, and its damage kills biters as they arrive, up to 3 magazines' worth ready at a time. It only fires while biters attack.
- **Peaceful mode** stops attacks. It's in the Military tab and the game menu.
- **Showing the attack:**
  - The Military tab has a perimeter radar, drawn on a canvas straight from the store (no React re-renders). It shows nests, the pollution haze, walls and turrets, with biters spawned at the real attack rate and killed at the real kill share.
  - The top bar has a threat bug, plus a pollution meter whose middle tick is the land's absorption.
  - Alert icons appear for turrets out of ammo and buildings destroyed.
  - While the base takes damage, the screen edges pulse red. Destroyed buildings flash on their cards, and starved ammo pulses in the sidebar.


## Architecture

```
src/
  engine/   pure, framework-free simulation (all game rules live here)
  store/    Redux Toolkit slices + save/load
  ui/       React components
    design/   design system: Radix UI primitives styled with Tailwind tokens
    charts/   uPlot charts (production chart, sparklines, chart dialog)
```

**Design system.** Every interactive primitive in `ui/design/` wraps Radix UI, so focus, keyboard support and ARIA come built in. Overlays (tooltips, selects, dialogs, popovers) render in portals, so they never clip or shift the layout. Colors are Tailwind `@theme` tokens in `src/index.css`.

| Component | Built on |
| --- | --- |
| Tooltip | Radix Tooltip |
| Select | Radix Select (shows the selected item's icon) |
| Dialog, ConfirmDialog | Radix Dialog, AlertDialog |
| Popover | Radix Popover |
| Menu | Radix DropdownMenu |
| Toast | Radix Toast |
| Tabs | Radix Tabs |
| SegmentedControl | Radix ToggleGroup |
| Switch | Radix Switch |
| Slider | Radix Slider |
| ProgressBar | Radix Progress |
| CollapsibleSection | Radix Collapsible |
| ScrollArea | Radix ScrollArea |
| Separator | Radix Separator |
| Button | Radix Slot (`asChild`) |
| Chip, Panel, Input, ResourceIcon | plain elements |

Open **`/design`** (e.g. http://localhost:5173/design) to see every component on one page.

**Charts** use [uPlot](https://github.com/leeoniya/uPlot): it is small, built for time series and fast enough to redraw a dozen sidebar sparklines every tick. Like Factorio's production screen, the Stats tab and the sparkline dialog show a *Produced* and a *Consumed* chart side by side, with a shared crosshair:

- You can chart up to 8 resources at once, as long as they share a unit (items, fluids or power). Adding one with a different unit starts a new selection.
- Colors come from a fixed 8-slot palette, and each resource keeps its color when others are removed.
- Clicking a sparkline opens the same view for that resource; clicking a row in the Stats table adds or removes it.
- A *Rate / Total* toggle switches the charts between per-second rates and the running total produced or consumed over the window.
- The Stats table lists absolute totals: produced, consumed and the net rate for the selected window, plus all-time produced and consumed. The game records both lifetime totals.

**Power breakdown.** The Energy tab's Power grid panel lists each electric machine type with:

- power used, and its share of the total used;
- power demanded, meaning what it would draw with unlimited power;
- satisfaction %.

During a brownout this shows exactly where the power goes.

**Sound effects** are synthesized with the Web Audio API, so there are no asset files. A Redux listener compares state before and after each tick and plays:

- a blip when a craft or build finishes;
- a chime when research completes (which is also when new content unlocks);
- a double beep when a power shortage starts;
- a buzz on errors.

Bursts are throttled. The speaker button in the top bar mutes them; the setting is stored per browser, not in the save.

- **`engine/catalog.ts`** holds all game content: items, recipes, machines and constants, with Factorio 2.0 values, checked against the wiki (burner drill 0.25/s at 150 kW, boiler 1.8 MW making 60 steam/s, steam engine 900 kW from 30 steam/s, and so on).
- **`engine/solver.ts`** is the heart of the game. Each tick it decides how fast every machine runs:
  - Items are limited by stock (inputs) and storage room (outputs).
  - Flows (water, steam, electricity) are never stored. Supply is pushed forward from producers (pump → boiler → engine → consumers) and demand is pulled back from consumers. So a weak pump starves boilers, which starve engines, which brown out every electric machine; and engines only burn steam (and boilers coal) for power that is actually used.
  - Shared inputs go to higher priorities first; within a priority they are split proportionally.
  - Resources freed by stalled machines are redistributed, then a final pass guarantees nothing is over-consumed.
  - Each slowed machine reports its binding constraint (e.g. "Low power", "Waiting for iron ore", "Iron plate storage full").
- **`engine/production.ts`** turns machine state into solver units, applies the results, and writes the tick report: actual vs potential, limits, flows and rates.
- **`engine/crafting.ts`** is the serial hand-crafting queue. Ingredients are reserved when you queue a craft. Missing intermediates are auto-queued as sub-jobs, and cancelling refunds everything, including finished sub-jobs.
- **`engine/technologies.ts`** and **`engine/research.ts`** hold the tech tree, the research queue and the trigger checks. Labs run a placeholder `research` recipe: their science-pack inputs come from the tech at the head of the queue.
- **`engine/simulation.ts`** holds `stepTick`, a fixed 0.1 s timestep, and `advance(state, ticks)`. The loop in `ui/use-game-loop.ts` spends real time in whole ticks and drops anything over 1 s (e.g. a hidden tab). Offline progress is not implemented yet, but saves record `savedAt`, so it only needs a call to `advance` for the elapsed ticks on load.
- **`engine/stats.ts`** keeps production history at five resolutions, like Factorio's production screen:

  | Scale | Resolution | Samples |
  | --- | --- | --- |
  | 5s | 0.1 s (every tick) | 50 |
  | 1m | 1 s | 60 |
  | 10m | 5 s | 120 |
  | 1h | 30 s | 120 |
  | 10h | 5 min | 120 |
- **Storage caps:** every item gets 10 slots, plus 32 per iron chest and 48 per steel chest. Its cap is slots × the Factorio stack size. Fluids get 1,000 units plus 25,000 per storage tank. A machine whose output is full stops working, and that stall travels up the chain.
- **`engine/effects.ts`** turns modules and research bonuses into speed, energy and output multipliers per machine and recipe. **`engine/daylight.ts`** has the day/night curve.
- **Accumulators** are two lowest-priority solver units: one charges from power nobody else wants, one discharges into shortfalls. Only their net flow changes the stored energy.

Conventions: kebab-case file names, arrow functions, exports at the bottom of each file, strict TypeScript with no `any`.

## Save format

Saves go to `localStorage` under `factidle-save`. The game autosaves every 30 s, and also when the tab is hidden or closed. The game menu (⋮) in the top bar also lets you save manually, export to a `.json` file, import one (with a confirmation step), or reset (also confirmed). The speaker button next to it mutes sound.

```json
{ "version": 5, "savedAt": "2026-10-08T12:00:00.000Z", "state": { "tick": 0, "inventory": {}, "machines": {}, "queue": [], "...": "..." } }
```

Loading runs `MIGRATIONS[v]` for each version from the save's version up to `SAVE_VERSION`, then `normalize` rebuilds a valid state from the untrusted data:

- unknown ids are dropped;
- negative or non-finite numbers are reset;
- over-allocated machines are scaled back to 100%;
- missing entries get new-game defaults.

If a save can't be read, it is copied to `factidle-save-unreadable` before anything can overwrite it, and a toast explains what happened.

Version 3, which added research, deliberately has no migration: older saves are discarded and start a new game. Versions 4 (oil, modules, solar, rocket) and 5 (combat) only added fields, so their migrations are no-ops. Unlocks are always rebuilt from the researched techs rather than read from the file.

So adding content needs no migration, while changing the state's shape needs a version bump and a migration in `store/persistence.ts`.

## Debug panel

In `bun run dev`, the top bar's game menu (⋮) has two extra entries: *Design system*, which opens `/design`, and *Debug panel*, which opens a popover where you can:

- pause, step one tick, or skip ahead a minute;
- research every technology at once;
- see the per-tick cost;
- set any item's amount, or fill every item to its cap;
- reset the state.

The panel isn't included in production builds.

## Tests

`bun run test` covers:

- **Production:** brownouts, demand-driven generation, coal and water shortages propagating down the chain, priorities, redistribution, storage stalls, a fuzzed "never negative" check, determinism and a performance budget.
- **Crafting:** reservations, auto-crafting, refunds.
- **Persistence:** round-trips, normalization, migrations.
- **Research:** triggers, the queue with prerequisites, and lab throughput under missing packs or low power.
- **Progression:** tech tree integrity (no cycles, every recipe unlockable, packs unlocked before they're needed), the day/night curve, solar before steam, accumulators charging and discharging, modules and research bonuses, fluid storage, a refinery stalled by full heavy oil, assembler-only recipes, placing stored buildings, and the rocket launch.
- **Combat:** the warning period before the cloud reaches the nests, attacks stopping once you're back under the line (a 16-drill burner base settles at 13), shooting by hand, the biter mix, overkill and resistances, pollution against land absorption, evolution, demand-driven turrets, walls before buildings, the loss cap, repairs, laser power, and peaceful mode.
- **Playthrough:** a scripted run from a new game, using only player actions, through the trigger techs, steam power and a lab, to an automated red-science research loop.
