---
name: laravel-api
description: Skill for Laravel API backend development — Eloquent, reflection-based dynamic routing, Sanctum, Microsoft OAuth, OpenAPI. Triggers on any PHP/Laravel API project.
model: claude-sonnet-5
user-invocable: true
type: framework
priority: high
scope: backend
dependencies:
  - context7-mcp
  - dto-architect
conflicts:
  - dotnet-developer
  - laravel-developer
---

# Laravel API

## 🔧 Services & Interfaces — Business orchestration

**Delegate to the `laravel-developer` skill** for the full Services section (interfaces, implementation, DI binding, patterns).

Short pattern: Service receives a Repository interface (never an implementation) → calls the repository → returns a ResponseDto. Transactions via `DB::transaction()`. Optional history tracking.

## ✓ Validators — Inline validation on RequestDTOs

Validation lives **at the edge of the request**. Inline `Validator::make()` in a DTO or FormRequest.

- **Mandatory location**:
  - `app/DTOs/Requests/*RequestDto.php` with a static `fromRequest()`
- **Critical elements**:
  - Basic validations (required, max, in, email, uuid, exists)
  - FK validations (exists:table,column)
  - Custom validations (business logic)
  - Localized messages
- **Routing by type-hint**: validation at the boundary controller
- **Exception**: `ValidationException::withMessages([...])` for custom cases
- **Full example** → see the `dto-architect` skill (CreateDemandeRequestDto.fromRequest)

## 📊 Projections — Query Builder select() for performance

Projections select **minimal columns** at the SQL level.

- **Placement**: in the Repository
- **Critical elements**:
  - Explicit `.select([...])` (never an implicit select *)
  - Map after `.get()` / `.first()`
  - No raw relations
  - Minimal columns only
- **Full example** → see the `dto-architect` skill (DemandeRepository.getDemandesByZoneAsDto)

## 🔄 Mappers — Model ↔ DTO conversion

Mapper classes transform Model ↔ DTO.

- **Mandatory location**:
  - `app/Mappers/*Mapper.php` (static methods)
- **Critical elements**:
  - Bidirectional: Model → DTO, RequestDto → Model (array)
  - Collections via `.map()`
  - Null-safety: check nullability
- **Timing**: after Model load, in a Resource, or in a service
- **Full example** → see the `dto-architect` skill (DemandeMapper)

## 📦 Repositories — Persistence abstraction

Repositories **abstract data access** — services call the repository, never Eloquent/Query Builder directly. Atomic transactions for multi-step operations.

### Full Laravel API structure

- **Mandatory location**:
  - `app/Repositories/Contracts/IRepository.php` (base interface)
  - `app/Repositories/Contracts/I<Entity>Repository.php` (specialized interface)
  - `app/Repositories/<Entity>Repository.php` (DI implementation)
- **Hierarchy**:
  - `IRepository` (base CRUD)
  - `I<Entity>Repository extends IRepository` (business)
  - `<Entity>Repository implements I<Entity>Repository` (implementation, constructor DI)
- **DI registration**:
  - `app/Providers/RepositoryServiceProvider.php`
  - Declare in `config/app.php`
- **Required**:
  - Atomic transactions (`DB::transaction()`) for multi-updates/inserts
  - Eager loading `.with()` (N+1 optimization)
  - Bulk `.update()` for performance
  - Projections: `.select([columns])` + mapper
  - Idempotency (acquire, assign, supervise)
  - Return bool/Collection/Model/DTO
- **Routing by type-hint**: RequestDto to the controller → Repository injection
- **Service calls the repository**: never Eloquent directly
- **Full example** → see the `dto-architect` skill (IRepository + IDemandeRepository + DemandeRepository)

## 📦 DTOs, Controllers, Models & Migrations — delegated to `dto-architect`

Every JSON response goes through a DTO/Resource — **never a raw serialized Eloquent Model**. Every POST/PUT/PATCH input is validated then converted to a `RequestDto`. Migrations include indices and constraints.

### Mandatory Laravel API structure

```
app/
├── Models/                       ← Eloquent Models (never raw in JSON)
│   └── Request.php
├── DTOs/
│   ├── Requests/                ← *RequestDto (validated via Validator::make())
│   │   └── CreateRequestDto.php
│   └── Responses/               ← *ResponseDto (API contract)
│       └── RequestResponseDto.php
├── Http/
│   ├── Controllers/             ← Dynamic routing by DTO type-hint
│   │   └── RequestController.php
│   └── Resources/               ← API Resources (Eloquent → ResponseDto)
│       └── RequestResource.php
├── Models/Traits/               ← Audit traits (HasDateTime, HasAuditUser, ...)
│   └── HasDateTime.php
└── Services/                    ← Business logic (optional)
    └── RequestService.php

database/migrations/             ← Structure + indices + constraints
    └── 2024_01_01_000000_create_requests_table.php
```

### Minimum rules

- **DTOs**: `readonly` classes (PHP 8.1+) · strict `RequestDto` / `ResponseDto` suffix · validation via `Validator::make()` in a static `fromRequest()`
- **API Resources**: `toArray()` returns the `ResponseDto`'s shape · map Eloquent → DTO · never expose the raw Model
- **Controllers**: receive a validated RequestDto via type-hint → call a service/create a Model → return via a Resource
- **Eloquent Models**: explicit `$fillable` · `$casts` for dates/booleans · well-typed relations · traits for audit (HasDateTime, HasAuditUser)
- **Migrations**: indices (Status, CreatedDate, ForeignKeys) · MaxLength on strings · explicit enums · cascade delete on required relations · DB-level defaults
- **Traits**: HasDateTime, HasAuditUser, HasDeadLine, HasAssignation, HasCode, HasSupervision — reduce duplication
- **Reflection-based routing**: the DTO type-hint on the controller enforces validation/conversion — whitelist target-method DTOs
- **Sensitive fields**: `password`, tokens, hashes, internal PII **excluded** from the Resource

### When to create DTOs/Migrations

- ✅ DTOs: every public REST endpoint, every queue handler
- ✅ Migrations: indices (Status, CreatedDate, FK), MaxLength, cascade delete, defaults, enum values

### Full detail

**Full structure (DTOs, Controllers, Models, Migrations, Traits, Resources, dynamic routing)** → see the `dto-architect` skill.

## Step 1 — Get oriented in the project

When opening any Laravel project, read in this order:
1. `CLAUDE.md` at the root (conventions, Context7, Graphify)
2. If `graphify-out/graph.json` exists: read `graphify-out/GRAPH_REPORT.md` before any Grep/Glob
3. `routes/api.php` to understand entry points
4. `app/Http/Kernel.php` for the middleware chain
5. Check for a `.gitignore` covering `.env`, `*.key`, private keys. **If a private key, a `.env`, or a secret is found versioned → flag it immediately and refuse to continue until it's addressed.**

## Project architecture

### Pure API project
No frontend rendering. All responses are JSON.
Blade views are limited to emails (`resources/views/emails/`).

### Eloquent models
Models are data objects tied to a table. Standard structure:

```php
class MyModel extends Model
{
    protected $table = 'my_table';
    protected $connection = 'connection_name'; // if non-default
    protected $fillable = [...];
    protected $casts = [...];

    // Eloquent relations
    public function relation(): BelongsTo { ... }
}
```

### Dynamic routing (ApiController)

A generic dispatcher calls model methods via reflection:

```
POST   /api/{zone_id}/{model_name}/{function_name}
GET    /api/get/{zone_id}/{model_name}/{function_name}
PATCH  /api/patch/{zone_id}/{model_name}
PUT    /api/put/{zone_id}/{model_name}
DELETE /api/delete/{zone_id}/{model_name}/{id}
```

`ApiController` instantiates `App\Models\{model_name}` and calls `{function_name}` by reflection.

> 🔴 **Reflection-based routing is an attack surface, not a convenience.** Every dynamic endpoint **must** enforce, in this order:
> 1. **Authentication** (`auth:sanctum`) — never a public dynamic route.
> 2. Explicit **whitelist** `model → allowed methods` in `ApiController` (a const `array`). A method absent from the list is rejected (403), even if it's `public`.
> 3. **Zone/ownership check**: `$user->zone_id === (int) $zone_id`.
> 4. **Argument validation** before `invokeArgs` (FormRequest or `Validator::make`).
>
> For any new resource, **prefer explicit routes + resource controllers** over extending the reflection mechanism.

### Database connections
Three available connections:

| Key | Usage |
|---|---|
| `default` | Primary database |
| `legacy_application` | Users, zones, profiles, apps |
| `geodata` | Geographic data (locations, streets) |

Declare `protected $connection` on any model that doesn't use the default connection.

## Authentication — layers and priorities

| Middleware | Usage |
|---|---|
| `ApiKeyMiddleware` | Validates the `X-API-KEY` header — secured public routes |
| `auth:sanctum` | Sanctum Bearer token — authenticated routes (**preferred**) |
| `remember_token_auth` | ⚠️ Persistent token stored **in plaintext** — don't extend (see note below) |
| `EnsureTokenIsValid` | Checks token expiration + permissions |
| `RoleMiddleware` | Role-based access control |

> ⚠️ **`remember_token_auth`** relies on a token stored **in plaintext** in the database (`hash=false`) and a fragile time window. **Don't extend it.** Target migration: `auth:sanctum` exclusively (hashed tokens). Never write `$user->remember_token = $plainTextToken`.

Microsoft OAuth via Socialite: routes `/auth/microsoft/redirect` and `/auth/microsoft/callback`.

## OpenAPI documentation

API docs are maintained in two places:
- `app/Docs/` — global annotations (schemas, auth endpoints)
- In the models if their methods are exposed via the dynamic API

Always document newly exposed methods.

> Never document or expose a method that returns table structure (`getStructure()`) or sensitive fields. The Swagger doc must be protected by authentication in production.

## Context7 — library documentation

For any question about libraries, use Context7:

| Library | Context7 ID |
|---|---|
| Laravel | `/laravel/framework` |
| Livewire | `/livewire/livewire` |
| Filament | `/filamentphp/filament` |
| Sanctum | `/laravel/sanctum` |

Syntax: pass the ID to `get-library-docs` or mention "use context7" in the request.

## Tests — PHPUnit

The project uses PHPUnit (`phpunit/phpunit` in `composer.json`, `phpunit.xml` present) — not Pest.

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;

class MyModelTest extends TestCase
{
    public function test_returns_expected_data(): void
    {
        $response = $this->getJson('/api/get/1/MyModel/getAll');
        $response->assertStatus(200);
    }
}
```

Run: `php artisan test`

## Common Artisan commands

```bash
php artisan make:model ModelName              # model in app/Models/
php artisan make:controller ControllerName    # controller
php artisan make:middleware MiddlewareName    # middleware
php artisan route:list --path=api           # API routes only
php artisan migrate                          # apply migrations
php artisan tinker                           # Eloquent REPL
php artisan config:clear && php artisan cache:clear
```

## 🎯 Invisible Button — UX pattern for Filament 4 tables

> **Mandatory rule** for every Filament `Table` with an actions column.

In data grids, action buttons repeated on every row create visual noise. Systematically apply the **Invisible Button** (IB) pattern.

### Filament 4 rules

- **All** row actions are **secondary by default** — hidden at rest, revealed on hover. There's no longer a "primary always visible" distinction.
- `->iconOnly()` is **mandatory** on every row action: no text label, icon only.
- The `->critical()` macro is no longer a standard choice — every button appears on hover.
- The **Actions column is sticky to the right** (`position: sticky; right: 0`) — applied globally via shared CSS. No separator border.

### Shared infrastructure (monorepo)

| Artifact | Path |
|---|---|
| Sticky + opacity CSS | `shared/monorepo-common/resources/css/invisible-button.css` |
| Trait to use | `shared/monorepo-common/src/Filament/Concerns/HasInvisibleRowActions.php` |
| ServiceProvider (macros) | `shared/monorepo-common/src/Providers/InvisibleButtonServiceProvider.php` |

### Implementation in a `*Table.php`

```php
use MonorepoCommon\Filament\Concerns\HasInvisibleRowActions;

class MyResourceTable extends Table
{
    use HasInvisibleRowActions;

    public function table(Table $table): Table
    {
        return $table
            ->columns([/* ... */])
            ->actions($this->applyInvisibleRowActions([
                Tables\Actions\EditAction::make()->iconOnly(),
                Tables\Actions\ViewAction::make()->iconOnly(),
                Tables\Actions\DeleteAction::make()->iconOnly(),
            ]));
    }
}
```

### Default visible columns

- **Before implementing a table**, ask the PO/user which columns should be visible by default.
- Rule: a maximum of **4–5 visible columns**. Secondary columns (dates, slugs, technical IDs, locales) are hidden:

```php
->toggleable(isToggledHiddenByDefault: true)
```

The user can show them again via Filament's native "Toggle columns" button.

## Final step — mandatory code review

At the end of any task that produces or modifies code, invoke the `code-reviewer` skill on the modified files.

Identify modified files via:
```bash
git diff --name-only
```

Then run `/code-reviewer` passing those files as context.
