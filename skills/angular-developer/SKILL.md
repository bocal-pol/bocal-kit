---
name: angular-developer
description: "Angular Developer — Angular 21+ standalone components, ChangeDetectionStrategy.OnPush, inject(), signals (input/output/computed/rxResource), NGXS store, Angular Material, Tailwind 4, ngx-translate, lazy routing with export default. Auto-invoke on: Angular component, standalone component, NGXS, Angular Material, ngx-translate, Angular signal, rxResource, inject(), OnPush, Angular reactive form, Angular routing, Angular 17 18 19 20 21."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: medium
scope: frontend
dependencies:
  - context7-mcp
  - dto-architect
  - logging-architect
conflicts:
  - react-developer
---

# Angular Developer

`[Activated: Angular Developer]`

Predictable, lightweight, accessible components. OnPush everywhere. Logic in stores and services, never in the template.

> **Absolute rule**: `ChangeDetectionStrategy.OnPush` on ALL components without exception. `inject()` only — never constructor injection. `export default` on every route component. `$` prefix for signals. Strict TypeScript — no `any`.

## 📦 DTOs — delegated to `dto-architect`

**An Angular component never touches a raw DTO** — the API service receives the DTO, then a mapper converts it to a UI Model before the store or component touch it.

- **Required location**:
  - `src/app/core/dtos/` → `<feature>-request.dto.ts`, `<feature>-response.dto.ts` (interfaces mirroring the backend)
  - `src/app/core/models/` → `<feature>.model.ts` (UI Model: parsed dates, computed properties)
  - `src/app/core/mappers/` → `<feature>.mapper.ts` (pure functions `toModel`, `toCreateRequest`)
  - `src/app/features/<feature>/services/*-api.service.ts` → signature `Observable<XxxResponseDto>` then `.pipe(map(mapper.toModel))`
- **Minimal rules**:
  - Strict `RequestDto` / `ResponseDto` suffix on DTOs (never just `UserDto`)
  - `readonly` on every field of a DTO (immutability)
  - The NGXS store holds **UI Models**, never DTOs
  - Reactive Forms: the `FormGroup.value` is converted to a `RequestDto` via the mapper before the HTTP call
  - No `any` — even DTOs generated from OpenAPI are strictly typed
- **When to create a DTO**: every endpoint called from the app, every payload sent to the backend.
- **Full detail (optional Zod, advanced mapping, versioning)** → see the `dto-architect` skill.

## Optional input (if invoked from `frontend-agent`)

If framework + version + functional description + stack are provided: skip Phase 1.

## Workflow

### Phase 1 — Angular context

```
Angular Developer — Context:
1. What to build:
   [ ] Presentational component   [ ] Container (smart)   [ ] Page/Route
   [ ] Service                     [ ] NGXS Store          [ ] Form
   [ ] Directive / Pipe            [ ] Guard / Interceptor
2. Functional description: [what it needs to do]
3. Stack: [Angular Material? Tailwind 4? NGXS? ng-select? ngx-translate? in-house CLI?]
4. Available API: [relevant endpoint(s) — generated service @org/xxx-api?]
```

> **Typical project note**: this project uses an in-house CLI (style + i18n sync), Angular Auth OIDC, and a generated API (`@org/feature-api`). Services inject the generated service (`FeatureServiceGen`) and wrap it with `fromDto()`. `HttpContext` with custom tokens (`SHOW_LOADER`, `SET_TENANT`) for interceptors.

### Phase 2 — Feature structure

> ⚠️ **Structure rule**: systematically separate `components/` (dumb) and `containers/` (smart). A container accesses the store, a component receives `input()`.

```
feature/
├── components/      # Presentational — input()/output() only
├── containers/      # Smart — store access, dispatch, navigation
├── services/        # API calls with @HandleHttpErrors()
├── stores/
│   └── feature/
│       ├── feature.actions.ts
│       └── feature.store.ts
├── models/          # Classes with static fromDto()
├── interfaces/      # TypeScript interfaces
├── enums/           # Enums
├── helpers/         # Pure utility functions
feature.component.ts
feature.routes.ts
```

### Phase 3 — Presentational component

> ⚠️ **Component rule**: `OnPush` mandatory · `input()` and `output()` for I/O · `computed()` for derived values · no direct store access

```typescript
// feature/components/feature-card/feature-card.component.ts
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

import { Feature } from '../../models/feature.model';

@Component({
    selector: 'app-feature-card',
    templateUrl: './feature-card.component.html',
    styleUrl: './feature-card.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgClass, TranslatePipe, MatButton, MatIcon]
})
export class FeatureCardComponent {

    //#region Inputs / Outputs
    readonly feature = input.required<Feature>();
    readonly selected = input<boolean>(false);
    readonly onSelect = output<Feature>();
    readonly onDelete = output<string>();
    //#endregion

    //#region Computed
    protected readonly cardClasses = computed(() => ({
        'card--selected': this.selected(),
        'card--inactive': !this.feature().active
    }));
    //#endregion

    //#region Handlers
    protected handleSelect(): void { this.onSelect.emit(this.feature()); }
    protected handleDelete(): void { this.onDelete.emit(this.feature().id); }
    //#endregion
}
export default FeatureCardComponent;
```

### Phase 4 — Smart container (store + rxResource)

> ⚠️ **Container rule**: `select()` / `dispatch()` for shared state (NGXS) · `rxResource` for component-local HTTP data · `toSignal()` to convert Observables to signals · never expose the store to child components · explicit imports (never a `../../stores` barrel)

```typescript
// feature/containers/feature-list/feature-list.component.ts
import { ChangeDetectionStrategy, Component, inject, signal, Signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { dispatch, select } from '@ngxs/store';
import { tap } from 'rxjs';

import { FeatureState } from '../../stores/feature/feature.store';
import { DeleteFeature } from '../../stores/feature/feature.actions';
import { FeatureService } from '../../services/feature.service';
import { FeatureCardComponent } from '../../components/feature-card/feature-card.component';
import { Feature } from '../../models/feature.model';

@Component({
    selector: 'app-feature-list',
    templateUrl: './feature-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FeatureCardComponent]
})
export class FeatureListComponent {

    //#region Injections
    private readonly router = inject(Router);
    private readonly featureService = inject(FeatureService);
    //#endregion

    //#region Store (shared state)
    protected readonly $selectedFeature: Signal<Feature | undefined> = select(FeatureState.selected);
    private readonly deleteFeature = dispatch(DeleteFeature);
    //#endregion

    //#region Data (local HTTP via rxResource)
    protected readonly page = signal(0);
    protected readonly features = rxResource({
        params: () => ({ page: this.page() }),
        loader: ({ params }) => this.featureService.getPage(params)
    });
    //#endregion

    //#region Handlers
    protected handleDelete(id: string): void { this.deleteFeature(id); }
    protected navigateTo(feature: Feature): void { this.router.navigate(['/features', feature.id]); }
    //#endregion
}
export default FeatureListComponent;
```

### Phase 5 — NGXS store

> ⚠️ **Store rule**: one action = one business verb · `patchState` only (never direct `setState` except reset) · static `@Selector()` · `catchError` mandatory on every HTTP action

```typescript
// feature/stores/feature/feature.actions.ts
export class FetchFeatures {
    static readonly type = '[Feature] Fetch all';
}
export class DeleteFeature {
    static readonly type = '[Feature] Delete by id';
    constructor(public id: string) {}
}
export class FeedFeature {
    static readonly type = '[Feature] Feed by id';
    constructor(public id: string) {}
}
export class ClearFeatureState {
    static readonly type = '[Feature] Clear state';
}
```

```typescript
// feature/stores/feature/feature.store.ts
import { inject, Injectable } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { Action, Selector, State, StateContext } from '@ngxs/store';

import { ErrorHandlerService } from '../../../core/modules/http-error/services/error-handler.service';
import { Feature } from '../../models/feature.model';
import { FeatureService } from '../../services/feature.service';
import { ClearFeatureState, DeleteFeature, FetchFeatures } from './feature.actions';
// Direct imports — never an index.ts barrel

export interface FeatureStateModel {
    features: Feature[];
    selected: Feature | undefined;
}

const defaultState: FeatureStateModel = { features: [], selected: undefined };

@State<FeatureStateModel>({ name: 'feature', defaults: { ...defaultState } })
@Injectable()
export class FeatureState {

    private readonly featureService = inject(FeatureService);
    private readonly errorHandlerService = inject(ErrorHandlerService);

    //#region Selectors
    @Selector() static features(s: FeatureStateModel) { return s.features; }
    @Selector() static selected(s: FeatureStateModel) { return s.selected; }
    //#endregion

    //#region Actions
    @Action(ClearFeatureState)
    clear(ctx: StateContext<FeatureStateModel>) { ctx.setState({ ...defaultState }); }

    @Action(FetchFeatures)
    fetchAll(ctx: StateContext<FeatureStateModel>) {
        return this.featureService.getAll().pipe(
            tap(features => ctx.patchState({ features })),
            catchError(err => { this.errorHandlerService.displayError('FEATURE.FETCH_ERROR'); return of(err); })
        );
    }

    @Action(DeleteFeature)
    delete(ctx: StateContext<FeatureStateModel>, { id }: DeleteFeature) {
        return this.featureService.delete(id).pipe(
            tap(() => {
                ctx.patchState({ features: ctx.getState().features.filter(f => f.id !== id) });
                this.errorHandlerService.displaySuccess('FEATURE.DELETE_SUCCESS');
            }),
            catchError(err => { this.errorHandlerService.displayError('FEATURE.DELETE_ERROR'); return of(err); })
        );
    }
    //#endregion
}
```

### Phase 6 — Lazy routing + Service + Model

> ⚠️ **Routing rule**: `loadComponent: () => import(...)` everywhere · `export default` mandatory · `canDeactivate: [unsavedChangesGuard]` on every route with a form

```typescript
// feature/feature.routes.ts
import { Route } from '@angular/router';
import { unsavedChangesGuard } from '../shared/guards/unsaved-changes.guard';

const routes: Route[] = [
    { path: '', loadComponent: () => import('./containers/feature-list/feature-list.component') },
    {
        path: 'create',
        loadComponent: () => import('./containers/feature-edit/feature-edit.component'),
        canDeactivate: [unsavedChangesGuard],
        data: { update: false }
    },
    {
        path: ':id/update',
        loadComponent: () => import('./containers/feature-edit/feature-edit.component'),
        canDeactivate: [unsavedChangesGuard],
        data: { update: true }
    }
];
export default routes;
```

```typescript
// feature/services/feature.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { HandleHttpErrors, ExcludeHttpErrorsHandling } from '../../core/modules/http-error/decorators/manage-http-errors.decorator';
import { SHOW_LOADER } from '../../core/modules/loader/loader.interceptor';
import { Feature } from '../models/feature.model';
import { FeatureServiceGen } from '@org/feature-api'; // adapt per project

@HandleHttpErrors()
@Injectable({ providedIn: 'root' })
export class FeatureService {
    private readonly api = inject(FeatureServiceGen);

    public getAll(): Observable<Feature[]> {
        return this.api.getAll(
            {},
            new HttpContext().set(SHOW_LOADER, true)
        ).pipe(map(dtos => dtos.map(Feature.fromDto)));
    }

    public delete(id: string): Observable<void> {
        return this.api.delete({ id });
    }

    @ExcludeHttpErrorsHandling([404])
    public getByIdOrNull(id: string): Observable<Feature | null> {
        return this.api.getById({ id }).pipe(map(Feature.fromDto));
    }
}
```

```typescript
// feature/models/feature.model.ts — exact project pattern: !assertions + constructor spread
import { FeatureDto } from '@org/feature-api'; // adapt per project

export class Feature {
    id!: string;
    name!: string;
    active!: boolean;

    constructor(base?: Partial<Feature>) {
        if (base) {
            Object.assign(this, base);
        }
    }

    public static fromDto(dto: FeatureDto): Feature {
        return new Feature({
            id: dto.id,
            name: dto.name,
            active: dto.active ?? true,
        });
    }
}
```

```typescript
// feature/containers/feature-edit/feature-edit.component.ts — Reactive Forms
// Pattern: FormGroup + FormControl without FormBuilder — Validators as an options object

import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { IHasUnsavedChanges } from '../../shared/guards/unsaved-changes.guard';

@Component({
    selector: 'app-feature-edit',
    templateUrl: './feature-edit.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReactiveFormsModule]
})
export class FeatureEditComponent implements OnInit, IHasUnsavedChanges {

    //#region Injections
    private readonly route = inject(ActivatedRoute);
    //#endregion

    protected form = new FormGroup({
        name: new FormControl<string>('', { validators: [Validators.required, Validators.maxLength(100)] }),
        active: new FormControl<boolean>(true),
    });

    // IHasUnsavedChanges contract — used by unsavedChangesGuard
    $hasUnsavedChanges = computed(() => this.form.dirty);

    ngOnInit(): void {
        const isUpdate = this.route.snapshot.data['update'] as boolean;
        if (isUpdate) { /* load data via rxResource or dispatch */ }
    }
}
export default FeatureEditComponent;
```

### Phase 7 — Accessibility + Tests

> ⚠️ **a11y rule**: linked labels (`for`/`id`), ARIA on interactive elements with no text, `role="alert"` for error messages

```typescript
// Vitest — Angular component test
import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FeatureCardComponent } from './feature-card.component';

describe('FeatureCardComponent', () => {
    it('should emit onDelete when delete button clicked', () => {
        const fixture = TestBed.createComponent(FeatureCardComponent);
        fixture.componentRef.setInput('feature', { id: '1', name: 'Test', active: true });
        const spy = vi.fn();
        fixture.componentInstance.onDelete.subscribe(spy);
        fixture.detectChanges();
        fixture.nativeElement.querySelector('[data-testid="delete-btn"]').click();
        expect(spy).toHaveBeenCalledWith('1');
    });
});
```

### Phase 8 — Conditional persistence

- **If invoked from `frontend-agent`**: return artifacts in Markdown.
- **If invoked standalone**: write the files directly into `src/app/<feature>/`.

### Phase 9 — Memory

> ⚠️ Skip if invoked from `frontend-agent`.

Record in the **current project's** `.claude/frontend-knowledge.md` (never in `~/.claude/`, which is the versioned, shared configuration): Angular version + UI library + state management + project-specific conventions.
