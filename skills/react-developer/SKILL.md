---
name: react-developer
description: "React Developer — React 18+ functional components, hooks, TanStack Query (server state), Zustand (UI state), strict TypeScript, Tailwind CSS, shadcn/ui, Vitest/Testing Library tests. Auto-invoke on: React component, React hook, TanStack Query, Zustand, React 18, JSX, TSX, functional component, useEffect, useState, custom hook, React Router."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: high
scope: frontend
dependencies:
  - context7-mcp
  - dto-architect
  - logging-architect
conflicts:
  - angular-developer
---

# React Developer

`[Activated: React Developer]`

Lightweight functional components, logic in hooks and stores. Server state in TanStack Query, UI state in Zustand. Strict TypeScript, never `any`.

> **Absolute rule**: functional components only — no class components. Hooks for everything. Server state in TanStack Query, never in `useState`. UI state in Zustand. Strict TypeScript. Barrel `index.ts` exports on every feature folder.

## 📦 DTOs — delegated to `dto-architect`

**A React component never binds a raw API DTO directly** — TanStack Query receives the DTO, a Zod schema validates it at runtime, then a mapper converts it into a UI Model.

- **Mandatory location**:
  - `src/dtos/` → `<feature>-request.dto.ts`, `<feature>-response.dto.ts` (interfaces mirroring the backend)
  - `src/schemas/` → `<feature>.schema.ts` (Zod schemas for runtime parsing/validation)
  - `src/models/` → `<feature>.model.ts` (UI Model)
  - `src/mappers/` → `<feature>.mapper.ts` (pure functions)
  - `src/features/<feature>/api/*-api.ts` → `queryFn` parses via Zod then `.then(mapper.toModel)`
- **Minimum rules**:
  - **Zod mandatory** at the API boundary: `UserResponseDtoSchema.parse(data)` — avoids silent backend/frontend drift
  - DTO type inferred from Zod: `type UserResponseDto = z.infer<typeof UserResponseDtoSchema>`
  - Strict `RequestDto` / `ResponseDto` suffix (never `UserDto`)
  - The Zustand store holds **UI Models**, never DTOs
  - React Hook Form + a Zod resolver on the form side — the mapper converts `FormValues → CreateRequestDto` before the API call
  - TanStack `queryKey`: `['feature', 'action', ...params]` format for targeted invalidation
- **When to create a DTO**: every consumed API endpoint, every TanStack mutation, every form submitted to the backend.
- **Full detail (versioning, advanced mapping, Suspense)** → see the `dto-architect` skill.

## Optional input (if invoked from `frontend-agent`)

If framework + version + functional description + stack are already provided: skip Phase 1.

## Workflow

### Phase 1 — React context

```
React Developer — Context:
1. What to build:
   [ ] UI component (dumb)    [ ] Page / Route
   [ ] Custom hook      [ ] Context provider
   [ ] Full feature       [ ] Form
2. Functional description: [what it should do]
3. Stack: [shadcn/ui? Tailwind? TanStack Query? Zustand? React Router?]
4. Available API: [relevant endpoint(s)]
```

### Phase 2 — Feature structure

> ⚠️ **Structure rule**: separate `components/` (dumb) from `containers/` or `pages/` (smart). Components don't make API calls. Logic lives in custom hooks.

```
feature/
├── components/       # Presentational — props only, no store/query access
├── hooks/            # Reusable logic — useFeature, useFeatureList...
├── stores/           # Zustand stores — UI state only
├── queries/          # TanStack Query — useFeatureQuery, useDeleteFeatureMutation...
├── services/         # Raw fetch/axios API calls, return DTOs
├── models/           # TypeScript types + fromDto() mappers
├── helpers/          # Pure utility functions
feature.page.tsx
feature.routes.tsx
```

### Phase 3 — Presentational component

> ⚠️ **Component rule**: never a data-fetching hook in a dumb component · props typed with an interface · `React.memo` for lists · no side effects, only handlers that call callbacks

```typescript
// feature/components/FeatureCard/FeatureCard.tsx
import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Feature } from '../../models/feature.model';

interface FeatureCardProps {
    feature: Feature;
    selected?: boolean;
    onSelect: (feature: Feature) => void;
    onDelete: (id: string) => void;
}

export const FeatureCard = React.memo(function FeatureCard({
    feature,
    selected = false,
    onSelect,
    onDelete,
}: FeatureCardProps) {
    return (
        <article
            className={cn('rounded-lg border p-4', selected && 'border-primary', !feature.active && 'opacity-50')}
            aria-selected={selected}
        >
            <h3 className="font-semibold">{feature.name}</h3>
            <div className="mt-2 flex gap-2">
                <Button onClick={() => onSelect(feature)}>Select</Button>
                <Button
                    variant="destructive"
                    onClick={() => onDelete(feature.id)}
                    data-testid="delete-btn"
                    aria-label={`Delete ${feature.name}`}
                >
                    Delete
                </Button>
            </div>
        </article>
    );
});
```

### Phase 4 — Logic hook (custom hook)

> ⚠️ **Hook rule**: one hook = one responsibility · always prefix with `use` · TanStack Query mutations live in the hook, not the component · `onSuccess`/`onError` in mutation callbacks

```typescript
// feature/hooks/useFeatureActions.ts
import { useNavigate } from 'react-router-dom';
import { useDeleteFeatureMutation } from '../queries/feature.queries';
import { Feature } from '../models/feature.model';

export function useFeatureActions() {
    const navigate = useNavigate();
    const deleteMutation = useDeleteFeatureMutation();

    function handleDelete(id: string): void {
        deleteMutation.mutate(id);
    }

    function navigateTo(feature: Feature): void {
        navigate(`/features/${feature.id}`);
    }

    return { handleDelete, navigateTo, isDeleting: deleteMutation.isPending };
}
```

### Phase 5 — TanStack Query (server state)

> ⚠️ **Server state rule**: EVERYTHING coming from the server goes through TanStack Query — never `useState` + `useEffect` for fetching · a stable, descriptive `queryKey` · `staleTime` explicitly set · `select` to transform the data

```typescript
// feature/queries/feature.queries.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { featureKeys } from './feature.keys';
import { featureService } from '../services/feature.service';
import { Feature } from '../models/feature.model';

export function useFeatureListQuery() {
    return useQuery({
        queryKey: featureKeys.list(),
        queryFn: () => featureService.getAll(),
        staleTime: 5 * 60 * 1000,
        select: (dtos) => dtos.map(Feature.fromDto),
    });
}

export function useDeleteFeatureMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => featureService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: featureKeys.list() });
        },
    });
}
```

```typescript
// feature/queries/feature.keys.ts
export const featureKeys = {
    all: ['features'] as const,
    list: () => [...featureKeys.all, 'list'] as const,
    detail: (id: string) => [...featureKeys.all, 'detail', id] as const,
};
```

### Phase 5bis — Frontend performance — checklist to check on EVERY deliverable

Query caching (TanStack Query), code splitting (`lazy()`, Phase 8), and ad-hoc memoization
(`React.memo`, Phase 3) are already covered above. The points below are not:

- [ ] **Skeleton loading**: every component that depends on a query (`isLoading`) shows a
  skeleton of the final shape, never a spinner alone — a spinner makes the page look slower
  than it is, a skeleton makes it look already ready.
- [ ] **Debounce**: every search/autocomplete field that triggers a request uses a debounce
  (`useDeferredValue` or a custom `useDebouncedValue` hook, ~300ms) — without it, every keystroke
  triggers an unneeded network call.
- [ ] **Optimistic UI**: every TanStack Query mutation on a reversible action (delete, edit)
  updates the cache via `onMutate` before the server response, with a rollback in `onError`
  — without this, the user waits for the network response to see the effect of their click.
- [ ] **Independent requests in parallel**: several independent `useQuery` calls fire together
  (React parallelizes them natively) — never a sequential `await` on hooks whose data does not
  depend on one another.
- [ ] **Images**: WebP/AVIF format with `srcset` sized to the screen, `loading="lazy"` attribute
  on every image below the fold — a full-resolution JPG loaded with priority delays the display
  of useful content.
- [ ] **Virtualized long lists** (`@tanstack/react-virtual` or equivalent) once a list can
  exceed ~100 rows — without virtualization, the entire DOM renders even off-screen.
- [ ] **Fonts**: self-hosted in WOFF2, at most 2 weights, declared with `font-display: swap`
  — a third-party font loaded from an external CDN adds a blocking network dependency.
- [ ] **Third-party scripts** (analytics, chat, pixels) loaded after initial interactivity
  (`defer`, deferred post-mount injection) — never in the `<head>` at initial load.
- [ ] **Real Core Web Vitals**: if a RUM tool is available in the project (e.g. Sentry,
  Vercel Analytics), real users' LCP/INP/CLS metrics are tracked — a synthetic test alone does
  not capture real users' network/device conditions.

> Systematic re-render memoization (beyond the `React.memo` already shown in Phase 3) and
> SSR/SSG rendering are to be evaluated case by case per project — no general rule imposed here.
> The carbon angle of these same optimizations (images, cache, no polling) is in
> `skills/green-it/SKILL.md` Phase 3 — refer to it instead of rewriting it.

### Phase 6 — Zustand (UI state)

> ⚠️ **UI state rule**: Zustand for UI state only (modals, selections, filters, pagination) — NOT for server data · slices separated by domain · `immer` for complex mutations

```typescript
// feature/stores/feature.store.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface FeatureUIState {
    selectedId: string | null;
    isCreateModalOpen: boolean;
    filters: { search: string; active: boolean | null };
    selectFeature: (id: string | null) => void;
    openCreateModal: () => void;
    closeCreateModal: () => void;
    setSearch: (search: string) => void;
}

export const useFeatureStore = create<FeatureUIState>()(
    immer((set) => ({
        selectedId: null,
        isCreateModalOpen: false,
        filters: { search: '', active: null },
        selectFeature: (id) => set((state) => { state.selectedId = id; }),
        openCreateModal: () => set((state) => { state.isCreateModalOpen = true; }),
        closeCreateModal: () => set((state) => { state.isCreateModalOpen = false; }),
        setSearch: (search) => set((state) => { state.filters.search = search; }),
    }))
);
```

### Phase 7 — Service + Model

> ⚠️ **Service rule**: services know nothing about TanStack Query · return raw DTOs · handle HTTP errors with throw · never any business logic

```typescript
// feature/services/feature.service.ts
import { apiClient } from '@/lib/api-client';
import { FeatureDto } from '../models/feature.model';

export const featureService = {
    async getAll(): Promise<FeatureDto[]> {
        const response = await apiClient.get<FeatureDto[]>('/features');
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await apiClient.delete(`/features/${id}`);
    },

    async create(payload: Omit<FeatureDto, 'id'>): Promise<FeatureDto> {
        const response = await apiClient.post<FeatureDto>('/features', payload);
        return response.data;
    },
};
```

```typescript
// feature/models/feature.model.ts
export interface FeatureDto {
    id?: string;
    name?: string;
    active?: boolean;
}

export class Feature {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly active: boolean,
    ) {}

    static fromDto(dto: FeatureDto): Feature {
        return new Feature(dto.id!, dto.name!, dto.active ?? true);
    }
}
```

### Phase 8 — Routing + Page

> ⚠️ **Routing rule**: React Router `lazy()` for every page · `Suspense` at the router level · `useBlocker` for unsaved forms

```typescript
// feature/feature.routes.tsx
import { lazy } from 'react';
import { RouteObject } from 'react-router-dom';

const FeatureListPage = lazy(() => import('./feature.page'));
const FeatureCreatePage = lazy(() => import('./containers/FeatureCreate/FeatureCreate.page'));
const FeatureEditPage = lazy(() => import('./containers/FeatureEdit/FeatureEdit.page'));

export const featureRoutes: RouteObject[] = [
    { index: true, element: <FeatureListPage /> },
    { path: 'create', element: <FeatureCreatePage /> },
    { path: ':id/edit', element: <FeatureEditPage /> },
];
```

### Phase 9 — Accessibility + Tests

> ⚠️ **a11y rule**: buttons with `aria-label` if there's no visible text · forms with linked labels · `role="alert"` for error messages · keyboard navigation tested

```typescript
// Vitest + Testing Library
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureCard } from './FeatureCard';

const mockFeature = { id: '1', name: 'Test Feature', active: true };

describe('FeatureCard', () => {
    it('should call onDelete with the feature id when delete button is clicked', () => {
        const onDelete = vi.fn();
        render(
            <FeatureCard
                feature={mockFeature}
                onSelect={vi.fn()}
                onDelete={onDelete}
            />
        );
        fireEvent.click(screen.getByTestId('delete-btn'));
        expect(onDelete).toHaveBeenCalledWith('1');
    });

    it('should apply opacity class when feature is inactive', () => {
        const { container } = render(
            <FeatureCard
                feature={{ ...mockFeature, active: false }}
                onSelect={vi.fn()}
                onDelete={vi.fn()}
            />
        );
        expect(container.firstChild).toHaveClass('opacity-50');
    });
});
```

### Phase 10 — Conditional persistence

- **If invoked from `frontend-agent`**: return the artifacts in Markdown.
- **If invoked standalone**: write the files directly into `src/features/<feature>/`.

### Phase 11 — Memory

> ⚠️ Skip if invoked from `frontend-agent`.

Record in `.claude/frontend-knowledge.md` **of the current project** (never in `~/.claude/`, which is the versioned, shared configuration): React version + UI library + state management + project-specific conventions.
