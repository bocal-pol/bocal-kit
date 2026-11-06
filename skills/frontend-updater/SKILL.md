---
name: frontend-updater
description: "Frontend Updater — analyzes an Angular or React project's current version, compares it against a target version, scans the code for outdated patterns, and generates a prioritized migration report (Breaking → Important → Recommended). Auto-invoke on: Angular migration, Angular update, React upgrade, Angular 14 15 16 17 18 19 20 21, React 16 17 18 19, breaking changes, Angular deprecation, ViewEngine to Ivy, modules to standalone, class components to hooks, deprecated API."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: low
scope: frontend
dependencies: []
conflicts: []
---

# Frontend Updater — Migration Report

`[Activated: Frontend Updater]`

Compares the current version against the target, scans the codebase for outdated patterns, and
generates an actionable, prioritized migration report.

## Optional input (if invoked from `frontend-agent`)

If framework + current version + target version are provided: start directly at Phase 2.

## Workflow

### Phase 1 — Information gathering

Read `package.json` to automatically detect:
- Framework and exact version (`@angular/core`, `react`)
- Related dependencies (router, forms, material, NGXS, TanStack Query, Zustand...)
- TypeScript version
- Build tools (Vite, esbuild, webpack...)

If the target version is missing, ask via AskUserQuestion:

```
Frontend Updater — Migration:
1. Detected framework: [Angular X.X.X / React X.X.X]
2. Target version: [leave blank = latest stable]
3. Scope to scan: [ ] Whole project  [ ] Specific folder: ___
```

### Phase 2 — Codebase scan

Scan with Grep + Glob to detect outdated patterns by framework.

**Systematic exclusions**: `node_modules/`, `vendor/`, `*.test.*`, `*.spec.*`, `dist/`, `build/`

#### Angular patterns to detect

| Outdated pattern | Since | Replacement |
|-----------------|--------|-----------|
| `NgModule` + `declarations` | v14+ | Standalone components |
| `ViewChild/ContentChild` without `static` | v8 | `viewChild()` signal |
| `@Input()` decorator | v16 | `input()` / `input.required()` |
| `@Output()` + `EventEmitter` | v16 | `output()` |
| `constructor(private svc: Service)` | v14 | `inject()` |
| `ChangeDetectionStrategy.Default` | always | `OnPush` |
| `AsyncPipe` in the template | v16 | `toSignal()` + direct template |
| `*ngIf` / `*ngFor` | v17 | `@if` / `@for` (built-in control flow) |
| `RouterModule.forRoot/forChild` | v15 | standalone `provideRouter()` |
| `HttpClientModule` | v15 | `provideHttpClient()` |
| `BrowserModule` in AppModule | v15 | `bootstrapApplication()` |
| `platformBrowserDynamic` | v14 | `bootstrapApplication()` |
| `TestBed.get()` | v9 | `TestBed.inject()` |
| Verbose `ComponentFixture.debugElement.nativeElement` | v14 | direct `fixture.nativeElement` |
| `ngOnInit` without the `OnInit` interface | always | implement the interface |
| `any` in services/stores | always | strict types |
| Explicit Zone.js in imports | v17+ | `provideZonelessChangeDetection()` (optional) |

#### React patterns to detect

| Outdated pattern | Since | Replacement |
|-----------------|--------|-----------|
| Class components | v16.8+ | Functional components + hooks |
| `componentDidMount` / `componentDidUpdate` | v16.8+ | `useEffect` |
| `shouldComponentUpdate` | v16.8+ | `React.memo` |
| `this.setState` | v16.8+ | `useState` / Zustand |
| `useState` + `useEffect` for fetching | v5 TanStack Query | `useQuery` |
| Runtime `PropTypes` | v15.5+ | TypeScript interfaces |
| `defaultProps` on a function | v18.3 | ES6 default parameters |
| `ReactDOM.render()` | v18 | `createRoot().render()` |
| `ReactDOM.hydrate()` | v18 | `hydrateRoot()` |
| String refs | v16 | `useRef` |
| Legacy Context API | v16.3 | `createContext` + `useContext` |
| `findDOMNode` | v18 | `useRef` |
| `unstable_` APIs in production | — | equivalent stable APIs |
| Non-unique `key` in lists | always | stable IDs (never an index) |

### Phase 3 — Building the migration report

> ⚠️ **Report rule**: each item must have a usable BEFORE/AFTER example. Breaking items block the
> build — list them first with an effort estimate.

Structure into 4 priority levels:

#### 🔴 Breaking Changes — Block compilation

Items that prevent the build or cause runtime errors after the update.

| # | Affected file(s) | Detected pattern | Required action | Effort |
|---|----------------------|----------------|----------------|--------|
| B01 | `src/app/app.module.ts` | `NgModule` + `BrowserModule` | Migrate to `bootstrapApplication()` | 2h |
| B02 | `src/app/**/*.component.ts` | Constructor injection (X occurrences) | Replace with `inject()` | 1h |

**Example B01:**
```typescript
// BEFORE — Angular < 14
@NgModule({ imports: [BrowserModule], bootstrap: [AppComponent] })
export class AppModule {}
platformBrowserDynamic().bootstrapModule(AppModule);

// AFTER — Angular 14+
bootstrapApplication(AppComponent, {
    providers: [provideRouter(routes), provideHttpClient()]
});
```

#### 🟠 Important — Performance or DX degradation

Items that don't block but impact performance or maintainability.

| # | File(s) | Pattern | Action | Effort |
|---|-----------|---------|--------|--------|
| I01 | `src/app/**/*.component.ts` | `@Input()` decorator | Migrate to `input()` signal | 3h |
| I02 | `src/app/**/*.component.ts` | `*ngIf` / `*ngFor` | Migrate to `@if` / `@for` | 2h |

#### 🟡 Recommended — Best practices & performance

Suggested but non-urgent improvements.

| # | File(s) | Pattern | Action | Effort |
|---|-----------|---------|--------|--------|
| R01 | `src/**/*.component.ts` | `AsyncPipe` | Replace with `toSignal()` | 4h |
| R02 | `src/**/*.service.ts` | `Observable` without `rxResource` | Migrate async patterns | 2h |

#### ℹ️ Optional — New available features

New features worth considering for new development.

| # | Feature | Benefit | Adoption effort |
|---|---------------|---------|------------------|
| O01 | `rxResource()` for async HTTP | Replaces `rxjs + BehaviorSubject` patterns | Medium |
| O02 | Signal-based forms | Reactive forms with signals | High |

### Phase 4 — Sequenced migration plan

> ⚠️ **Sequence rule**: Breaking Changes first, in dependency order (e.g. bootstrapping before
> components). Don't mix Angular schematics with manual migrations on the same files.

```markdown
## Migration Plan — [Framework] [Current version] → [Target version]

### Step 1 — Package updates (30 min)
```bash
# Angular — use ng update for automatic schematics
npx ng update @angular/core@21 @angular/cli@21 --force
npx ng update @angular/material@21

# React — manual update
npm install react@19 react-dom@19 @types/react@19 @types/react-dom@19
```

### Step 2 — Automatic Breaking Changes (ng update schematics)
- `ng update` applies some migrations automatically via schematics
- Inspect the git diff before committing

### Step 3 — Manual Breaking Changes
- [ ] B01: Migrate to bootstrapApplication (app.module.ts)
- [ ] B02: Replace constructor injection → inject() (X files)

### Step 4 — Important
- [ ] I01: Migrate @Input() → input() signal
- [ ] I02: Migrate *ngIf/*ngFor → @if/@for

### Step 5 — Recommended (next sprint)
- [ ] R01: Migrate AsyncPipe → toSignal()
- [ ] R02: Async patterns with rxResource

### Validation at each step
- [ ] `ng build` / `npm run build` → zero errors
- [ ] Unit tests pass
- [ ] No visual regression (manual smoke test)
```

### Phase 5 — Conditional persistence

- **If invoked from `frontend-agent`**: return the full report in Markdown.
- **If invoked standalone**:
  1. Create the folder via Bash: `mkdir -p frontend/migrations`
  2. Write `frontend/migrations/YYYY-MM-DD_[framework]-[currentV]-to-[targetV]-migration.md`

### Phase 6 — Memory

> ⚠️ Skip if invoked from `frontend-agent`.

Record in `.claude/frontend-knowledge.md` **of the current project** (never in `~/.claude/`, which
is the shared, versioned configuration):
- Current version and target version
- Number of detected Breaking Changes
- Most common patterns to migrate
- Total estimated effort
