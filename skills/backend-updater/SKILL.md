---
name: backend-updater
description: "Backend Updater — Laravel and .NET technology watch, current vs. target version comparison, codebase scan for deprecated patterns, prioritized migration report (Breaking → Important → Recommended). Auto-invoke on: Laravel migration, .NET update, Laravel 9 10 11 12 upgrade, .NET 8 9 10, Laravel breaking changes, deprecated .NET API, PHP 8 upgrade, dotnet upgrade, backend technology watch."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: low
scope: backend
dependencies: []
conflicts: []
---

# Backend Updater — Technology Watch & Migration

`[Activated: Backend Updater]`

Detects the current version, compares it with the target, scans the codebase for deprecated patterns, and generates an actionable migration report.

## Optional input (if invoked from `backend-agent`)

If framework + current version + target version are provided: start directly at Phase 2.

## Workflow

### Phase 1 — Information gathering

**Laravel**: read `composer.json` — fields `require."laravel/framework"`, `require."php"`, third-party packages.

**.NET**: read `Directory.Build.props` and the `.csproj` files — `<TargetFramework>`, NuGet packages with versions.

If the target version is missing, ask via AskUserQuestion:

```
Backend Updater — Migration:
1. Detected framework: [Laravel X.X / .NET X.X]
2. Target version: [leave empty = latest stable]
3. Scope to scan: [ ] Whole project  [ ] Specific folder: ___
4. Mode: [ ] Migration only  [ ] Full technology watch  [ ] Both
```

### Phase 2 — Codebase scan

Scan with Grep + Glob for deprecated patterns per framework.

**Exclusions**: `vendor/`, `node_modules/`, `*.test.*`, `*Test.*`, `*Tests.*`, `bin/`, `obj/`, `dist/`

---

#### Deprecated Laravel patterns to detect

| Deprecated pattern | Since | Replacement |
|-----------------|--------|-----------|
| `->withoutExceptionHandling()` with no alternative | L9 → L10 | Updated test pattern |
| `$this->app->bind(Interface::class, Implementation::class)` in tests | L10 | `$this->swap()` |
| `Route::fallback(fn() => ...)` with a closure | L10 | Invokable controller |
| `DB::table()->crossJoin()` | L9 | `->crossJoinSub()` if dynamic |
| `Illuminate\Http\Request::all()` with no typing | always | `$request->validated()` after validation |
| `new Model($array)` + `->save()` | always | `Model::create($array)` if mass-assignable |
| `$this->artisan('migrate:fresh --seed')` in a Feature test | L10 | `RefreshDatabase` + declared Seeders |
| `Facade::shouldReceive()` on unmocked Facades | L11 | `$this->mock(Service::class)` |
| `Carbon::now()` with no timezone | L11 | `now()` helper or `Carbon::now('UTC')` |
| `->json()` assertions without chained `->assertJson()` | L10 | Chain the assertions |
| `Config::set()` in tests with no `tearDown` | L10 | `$this->withConfig()` helper |
| `php artisan make:controller --resource` (verbose style) | L11 | `--api` flag |
| `$request->input()` on validated fields | L11 | `$request->validated()` or `$request->safe()` |
| `Illuminate\Support\Str::uuid()` directly | L11 | `Str::orderedUuid()` for DB performance |
| `middleware()` in a Controller constructor | L11 | `#[Middleware(...)]` attribute |
| `$this->authorize()` with no Policy | L10 | Create the matching Policy |
| Closures in casts | L11 | `CastsAttributes` interface |
| `DB::select()` raw SQL with no binding | always | Eloquent or `?` bindings |
| `Event::fake()` with no assertion | L11 | `Event::assertDispatched()` mandatory |

#### Deprecated .NET patterns to detect

| Deprecated pattern | Since | Replacement |
|-----------------|--------|-----------|
| Separate `Startup.cs` + `Program.cs` | .NET 6 | Minimal hosting `Program.cs` |
| `services.AddControllers()` without `AddEndpointsApiExplorer()` | .NET 6+ | Both together for Swagger |
| `[ApiController]` without explicit `[Route]` | always | Explicit `[Route("api/[controller]")]` |
| `async Task` without `CancellationToken` | always | `CancellationToken ct = default` on every async method |
| `await context.SaveChangesAsync()` without `ct` | always | Pass the `CancellationToken` |
| `new HttpClient()` directly | always | `IHttpClientFactory` via DI |
| `.Result` or `.Wait()` on a Task | always | `await` |
| `IEnumerable<T>` returned from DB | always | `IAsyncEnumerable<T>` or `List<T>` |
| `string.IsNullOrEmpty()` without nullable `?` | .NET 6+ | `string.IsNullOrEmpty()` + nullable enabled |
| `object` as a generic type | .NET 7+ | Typed generics or explicit `dynamic` |
| `throw ex` (loses the stack) | always | Bare `throw` to re-throw |
| Constructor injection with > 5 parameters | always | Group into aggregated services |
| `var` on an ambiguous method's return type | always | Explicit type |
| `[FromBody]` without `[Required]` on DTOs | always | `[Required]` or explicit nullable |
| `DateTime.Now` (local timezone) | always | `DateTime.UtcNow` |
| `Thread.Sleep()` | always | `Task.Delay()` with await |
| `.ToList()` before `.Select()` or `.Where()` | always | Keep the query lazy |
| `DbContext` injected into a Singleton | always | `IDbContextFactory<T>` in Singletons |
| Deep `.Include().Include()` (N+1) | always | `.AsSplitQuery()` beyond 2 levels |
| `Microsoft.AspNetCore.Http.Results` (Minimal API) without `TypedResults` | .NET 7+ | `TypedResults` for correct OpenAPI |

---

### Phase 3 — Technology watch

> ⚠️ **Watch rule**: base this on information known up to the knowledge cutoff + versions detected in the project · clearly flag "verify online" for recent patch information

#### Laravel version calendar

| Version | Min PHP | Active support | Security support | Status |
|---------|---------|--------------|-----------------|--------|
| Laravel 9 | 8.0 | Ended (Feb 2023) | Ended (Feb 2024) | **EOL** |
| Laravel 10 | 8.1 | Ended (Aug 2024) | Ended (Feb 2025) | **EOL** |
| Laravel 11 | 8.2 | Ended (Mar 2025) | Aug 2025 | **Near end** |
| Laravel 12 | 8.2 | Mar 2026 | Feb 2027 | **Current** |

**Major changes per version:**

- **Laravel 10**: `app/Http/Kernel.php` restructured · PHP 8.1 min · strict types on stubs · `Model::query()` everywhere · Pest natively integrated
- **Laravel 11**: Slim structure (1 single config file by default) · centralized `bootstrap/app.php` · `withRouting()` · `withMiddleware()` · `#[Middleware]` attribute · Reverb (WebSockets) · Volt (Livewire) · PHP 8.2 min
- **Laravel 12**: PHP 8.2 min · revisited React/Vue/Livewire starter kits · WorkOS Auth (Socialite) · improved `Model::query()->toBase()`

**PHP packages to watch:**

| Package | Use | Latest stable version |
|---------|------------|------------------------|
| `spatie/laravel-permission` | Role/permission management | v6.x |
| `spatie/laravel-activity-log` | Audit trail | v4.x |
| `spatie/laravel-query-builder` | API filtering | v5.x |
| `laravel/horizon` | Queue monitoring | v5.x |
| `laravel/telescope` | Debug/observability | v5.x |
| `laravel/octane` | Performance (Swoole/RoadRunner) | v2.x |
| `predis/predis` | Redis client | v2.x |
| `darkaonline/l5-swagger` | OpenAPI Swagger | v8.x |
| `barryvdh/laravel-debugbar` | Dev debugging | v3.x |

#### .NET version calendar

| Version | LTS | Support | Status |
|---------|-----|---------|--------|
| .NET 6 | ✅ | Ended (Nov 2024) | **EOL** |
| .NET 7 | ❌ | Ended (May 2024) | **EOL** |
| .NET 8 | ✅ | Until Nov 2026 | **Active LTS** |
| .NET 9 | ❌ | Until May 2026 | **Active** |
| .NET 10 | ✅ | Until Nov 2028 | **Latest LTS** |

**Major changes per version:**

- **.NET 8**: Frozen collections · `TimeProvider` abstraction · Keyed DI (`AddKeyedSingleton`) · C# 12 primary constructors · `SearchValues<T>` for performance · `IExceptionHandler` interface
- **.NET 9**: `Task.WhenEach()` · `JsonSchemaExporter` · `HybridCache` (multi-tier) · extended `SearchValues` · built-in OpenAPI (without Swashbuckle) · LINQ `CountBy()`, `AggregateBy()`
- **.NET 10**: AOT improvements · generalized `TypedResults` · `IHostedLifecycleService` · native OpenAPI v3.1 · improved `DistributedCache`

**NuGet to watch:**

| Package | Use | Latest stable version |
|---------|------------|------------------------|
| `FluentValidation.AspNetCore` | Validation | v11.x |
| `MediatR` | CQRS/messaging | v12.x |
| `Hangfire` | Background jobs | v1.8.x |
| `Polly` | Resilience | v8.x |
| `Serilog.AspNetCore` | Structured logging | v8.x |
| `Mapster` | Alternative mapping | v7.x |
| `Microsoft.AspNetCore.OpenApi` | Native OpenAPI | .NET 9+ |
| `Aspire.Hosting` | Local orchestration | v9.x |
| `FastEndpoints` | Minimal API structure | v5.x |

---

### Phase 4 — Report construction

> ⚠️ **Report rule**: every item must have a BEFORE/AFTER example · Breaking Changes block the build or security · estimate effort in hours · give the exact commands to run

#### 🔴 Breaking Changes — Block compilation or security

| # | File(s) | Detected pattern | Required action | Effort |
|---|-----------|----------------|----------------|--------|
| B01 | ... | ... | ... | Xh |

**Example:**
```php
// BEFORE — Laravel 9 (Kernel.php structure)
// app/Http/Kernel.php — dedicated file with $middleware, $middlewareGroups
protected $middleware = [ \App\Http\Middleware\TrustProxies::class, ... ];

// AFTER — Laravel 11 (centralized bootstrap/app.php)
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(web: __DIR__.'/../routes/web.php', api: __DIR__.'/../routes/api.php')
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->api(append: [ApiKeyMiddleware::class]);
    })
    ->create();
```

#### 🟠 Important — Degraded performance or maintainability

| # | File(s) | Pattern | Action | Effort |
|---|-----------|---------|--------|--------|
| I01 | ... | ... | ... | Xh |

#### 🟡 Recommended — New best practices available

| # | File(s) | Pattern | Action | Effort |
|---|-----------|---------|--------|--------|
| R01 | ... | ... | ... | Xh |

#### ℹ️ Watch — New features to evaluate

| # | Feature | Potential benefit | Adoption effort |
|---|---------------|-------------------|------------------|
| V01 | ... | ... | ... |

---

### Phase 5 — Sequenced migration plan

```markdown
## Migration plan — [Framework] [Current version] → [Target version]
Analysis date: YYYY-MM-DD

### Update commands

#### Laravel
```bash
# 1. Update composer.json
composer require laravel/framework:"^12.0" --no-update

# 2. Update dependencies
composer update

# 3. Publish config changes if needed
php artisan vendor:publish --tag=laravel-errors

# 4. Check breaking changes
php artisan migrate:status
```

#### .NET
```bash
# 1. Update TargetFramework in .csproj
# Replace net9.0 with net10.0

# 2. Update NuGet packages
dotnet outdated --upgrade  # (tool: dotnet tool install --global dotnet-outdated-tool)
# OR manually
dotnet add package Microsoft.EntityFrameworkCore --version 10.*

# 3. Check compilation warnings
dotnet build --configuration Release 2>&1 | grep -i "warn\|error"
```

### Steps by priority

1. **Breaking Changes** (week 1)
   - [ ] B01: [description + command]
   - [ ] B02: ...

2. **Important** (week 2)
   - [ ] I01: ...

3. **Recommended** (next sprint)
   - [ ] R01: ...

### Validation at each step
- [ ] Build with no errors
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] API smoke test (sanity check on critical endpoints)
```

---

### Phase 6 — Conditional persistence

- **If invoked from `backend-agent`**: return the full report in Markdown.
- **If invoked standalone**:
  1. Create the folder via Bash: `mkdir -p backend/updates`
  2. Write `backend/updates/YYYY-MM-DD_[framework]-[currentV]-to-[targetV]-update.md`

### Phase 7 — Memory

> ⚠️ Skip if invoked from `backend-agent`.

Record in `<project>/.claude/backend-knowledge.md`:
- Current version, target version, analysis date
- Number of Breaking Changes detected
- EOL packages to replace
- Total estimated effort
