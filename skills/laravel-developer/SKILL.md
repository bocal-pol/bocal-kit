---
name: laravel-developer
description: "Laravel Developer — Laravel 9+, PHP 8+, Eloquent ORM, Sanctum, business logic in Models (static methods), inline validation with Validator::make(), JSON responses via API Resource (JsonResource), OpenAPI L5-Swagger, PHPUnit, multi-connection DB. Auto-invoke on: Laravel, Eloquent, Artisan, Sanctum, Socialite, Laravel migration, Laravel controller, Eloquent model, Laravel route, Laravel middleware, PHP 8, composer."
model: claude-sonnet-5
user-invocable: true
type: framework
priority: high
scope: backend
dependencies:
  - context7-mcp
  - dto-architect
  - logging-architect
conflicts:
  - dotnet-developer
  - laravel-api
---

# Laravel Developer

`[Activated: Laravel Developer]`

Classic MVC with business logic in the Models. Inline validation, JSON responses via API Resource, Swagger annotations on every endpoint.

> **Absolute rule**: business logic in Model methods (static and instance) · validation via `Validator::make()` in controllers (no FormRequest) · JSON responses via **API Resource** (`JsonResource`) as soon as a Model contains sensitive fields or relations — never a raw Model in the response; direct `response()->json()` only for already-filtered payloads (messages, aggregates) · `DB::transaction()` for any multi-table operation · `@OA\` annotations on every public endpoint · `Log::info/warning/error()` with array context — **never a password, hash, token, or PII in logs**.

## ✓ Validators — Inline validation on RequestDTOs

Validation lives **at the edge of the request**. Inline `Validator::make()` in a DTO or FormRequest.

- **Two approaches**:
  1. **DTO.fromRequest()**: `Validator::make()` + static `rules()`/`messages()`
  2. **FormRequest**: a dedicated class for validation + authorization
- **Mandatory location**:
  - `app/DTOs/Requests/*RequestDto.php` (DTO with a static `fromRequest()`)
  - OR `app/Http/Requests/*.php` (FormRequest)
- **Critical elements**:
  - Basic validations (required, max, in, regex)
  - FK validations (exists:table,column)
  - Custom validations (complex business logic)
  - Localized messages (static `messages()`)
  - Reusability (static rules)
- **Exception**: `ValidationException::withMessages([...])` for custom cases
- **Full example** → see the `dto-architect` skill (CreateDemandeRequestDto with fromRequest + rules + messages)

## 📊 Projections — Query Builder select() for performance

Projections select **minimal columns** at the SQL level for performance (avoids loading the full Model).

- **Placement**: in the Repository
- **Critical elements**:
  - Explicit `.select([...])` of columns (never an implicit select *)
  - Map Model → DTO after `.get()`
  - No raw relations (avoids N+1)
  - Minimal columns only
- **Alternative (with relations)**: `.with()` then map in memory if navigation is required
- **Full example** → see the `dto-architect` skill (DemandeRepository with minimized select)

## 🔧 Services & Interfaces — Business orchestration

Services orchestrate business logic: **validated RequestDto → Repository → Transformations → ResponseDto**. Never business logic in the controller or the repository.

### Mandatory Laravel structure

```
app/
├── Services/
│   ├── Contracts/                   ← Interfaces
│   │   └── IDemandeService.php
│   └── DemandeService.php      ← Implementation (constructor DI)
├── Repositories/
│   ├── Contracts/
│   │   ├── IRepository.php          ← Base CRUD
│   │   └── IDemandeRepository.php
│   └── DemandeRepository.php
├── Providers/
│   └── RepositoryServiceProvider.php ← DI binding
```

### Specialized service interface

```php
// app/Services/Contracts/IDemandeService.php
namespace App\Services\Contracts;

use App\DTOs\Requests\DemandeWriteRequestDto;
use App\DTOs\Responses\DemandeResponseDto;

interface IDemandeService
{
    public function createDemande(DemandeWriteRequestDto $dto): DemandeResponseDto;
    public function getDemande(string $id): DemandeResponseDto;
    public function updateDemande(string $id, DemandeWriteRequestDto $dto): DemandeResponseDto;
    public function assignDemande(string $id, string $operatorId): DemandeResponseDto;
    public function generateIAContent(string $id): void;
}
```

### Service implementation

```php
// app/Services/DemandeService.php
namespace App\Services;

use App\Services\Contracts\IDemandeService;
use App\Repositories\Contracts\IDemandeRepository;
use App\Models\Demande;
use Illuminate\Database\DatabaseManager as DB;
use Illuminate\Support\Facades\{Log, Queue};

class DemandeService implements IDemandeService
{
    public function __construct(
        private IDemandeRepository $demande,
        private SomeAiService $ai,
        private DemandeBusinessRuleService $br,
        private EmailService $emailService,
        private DB $db,
    ) {}

    /**
     * CREATE — Transaction: Validate → Map → Persist → Enqueue → Return
     */
    public function createDemande(DemandeWriteRequestDto $dto): DemandeResponseDto
    {
        return $this->db->transaction(function () use ($dto) {
            // 1. Map DTO → Model
            $model = Demande::fromRequestDto($dto);

            // 2. Persist via the repository
            $this->demande->create($model->toArray());

            // 3. Enqueue asynchronously
            Queue::push(new DemandeCreatedJob($model->id));

            Log::info('Demande created', ['id' => $model->id]);

            // 4. Return DTO
            return $this->getDemande($model->id);
        });
    }

    /**
     * ASSIGN — Atomic + idempotent
     */
    public function assignDemande(string $id, string $operatorId): DemandeResponseDto
    {
        return $this->db->transaction(function () use ($id, $operatorId) {
            $demande = $this->demande->findById($id);

            if ($demande->assigned_user_id === $operatorId) {
                return $this->getDemande($id); // Idempotent
            }

            // Check business rules
            $this->br->canAssign($demande);

            // Assign atomically
            $this->demande->update($id, [
                'assigned_user_id' => $operatorId,
                'assigned_date' => now(),
            ]);

            // Trace
            $demande->histories()->create([
                'action' => 'assigned',
                'user_id' => auth()->id(),
            ]);

            return $this->getDemande($id);
        });
    }

    /**
     * ORCHESTRATE AI — Provider → Persistence → Enqueue
     */
    public function generateIAContent(string $id): void
    {
        $this->db->transaction(function () use ($id) {
            $demande = $this->demande->findWithIaDetails($id);
            $result = $this->ai->generateSummary($demande);

            if (!$result->success) {
                Log::error('AI generation failed', ['id' => $id]);
                return;
            }

            // Persist
            $demande->summary->update([
                'content' => $result->content,
                'status' => 'done',
            ]);

            // Enqueue the next step
            Queue::push(new SendUrgentEmailJob($id));
            Log::info('AI content generated', ['id' => $id]);
        });
    }

    private function getDemande(string $id): DemandeResponseDto
    {
        $model = $this->demande->findById($id);
        return DemandeMapper::toResponseDto($model);
    }
}
```

### Dependency injection (RepositoryServiceProvider)

```php
// app/Providers/RepositoryServiceProvider.php
namespace App\Providers;

use App\Repositories\Contracts\{IRepository, IDemandeRepository};
use App\Repositories\DemandeRepository;
use App\Services\Contracts\IDemandeService;
use App\Services\DemandeService;

class RepositoryServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->app->bind(IDemandeRepository::class, DemandeRepository::class);
        $this->app->bind(IDemandeService::class, DemandeService::class);
    }
}

// config/app.php — register the provider
'providers' => [
    App\Providers\RepositoryServiceProvider::class,
],
```

### Controller — calls the service, never the repository directly

```php
// app/Http/Controllers/DemandeController.php
class DemandeController
{
    public function __construct(private IDemandeService $service) {}

    public function store(DemandeWriteRequestDto $dto)
    {
        // The service handles: validation (DTO), persistence, queue, return DTO
        $result = $this->service->createDemande($dto);
        return response()->json($result, 201);
    }
}
```

**Key patterns**:
- `DB::transaction()` — atomicity is mandatory
- Idempotence — check state before acting
- History tracking — every mutation logged
- `Queue::push()` — asynchronous, no waiting
- Contextualized `Log::info()` — user_id, resource id, never a secret
- **Service receives an interface injection**, never an implementation

### Where business logic lives

| Logic | Home | Never in |
|---------|----------|-------------|
| Base validations (required, max, in) | **Validator** (`Validator::make()`) | ❌ Service |
| Complex rules (state machine, dependencies) | **BusinessRuleService** or Model | ❌ Controller |
| Entity ↔ DTO transformation | **Mapper** (static class) | ❌ Service |
| Persistence access | **Repository** (interface) | ❌ Service directly |
| Orchestration (service calls + persistence) | **Service** (here) | ✅ Correct |
| Multi-step transactions | **Service** (`DB::transaction()`) | ❌ Repository |
| Domain business behavior | **Model** (methods) | ❌ Raw Service |

See the `dto-architect` skill for the **full Services section** (.NET, Laravel, full schemas, advanced patterns).

## 🔄 Mappers — Model ↔ DTO conversion

Mapper classes transform Model ↔ DTO at the appropriate time.

- **Mandatory location**:
  - `app/Mappers/*Mapper.php` (class with static methods)
- **Critical elements**:
  - Static methods (no instantiation)
  - Bidirectional: Model → DTO, RequestDto → Model (array)
  - Collections: `.map()` to transform arrays
  - Enums: raw value or string depending on need
  - Null-safety: check nullability before conversion
- **Timing**:
  - After `.get()` or `.first()` (Model loaded in memory)
  - In the Resource's `toArray()` before JSON
- **Full example** → see the `dto-architect` skill (DemandeMapper with toDto + toDtos + toDetailDto + fromRequestDto)

## 📦 Repositories — Persistence abstraction

Repositories **abstract data access** — services call the repository, never Eloquent/Query Builder directly.

### Full Laravel structure

- **Mandatory location**:
  - `app/Repositories/Contracts/IRepository.php` (base CRUD interface)
  - `app/Repositories/Contracts/I<Entity>Repository.php` (specialized interface)
  - `app/Repositories/<Entity>Repository.php` (implementation, constructor DI)
- **Hierarchy**:
  - `IRepository` (CRUD: get, find, findById, create, update, delete, count, exists)
  - `I<Entity>Repository extends IRepository` (specialized business queries)
  - `<Entity>Repository implements I<Entity>Repository` (implementation)
- **DI registration**:
  - `app/Providers/RepositoryServiceProvider.php` → `$this->app->bind(I<Entity>Repository::class, <Entity>Repository::class)`
  - Register the provider in `config/app.php`
- **Required**:
  - Atomic transactions (`DB::transaction()`) for multi-updates
  - Eager loading `.with()` (no N+1)
  - Bulk updates via `.update()` for performance
  - Projections: `.select([columns])` + mapper
  - Idempotency on sensitive queries (acquire, assign, supervise)
  - Return bool/Collection/Model/DTO
- **Service calls the repository via injection**: never Eloquent/DB directly
- **Full example** → see the `dto-architect` skill (IRepository + IDemandeRepository + DemandeRepository + RepositoryServiceProvider)

## 📦 DTOs, Controllers, Models & Migrations — delegated to `dto-architect`

Every API endpoint produces OR consumes a DTO. **No Eloquent Model is ever exposed in a response**.

### Full Laravel structure

```
app/
├── Models/                       ← Eloquent Models (never raw in JSON)
│   └── Demande.php
├── DTOs/
│   ├── Requests/                ← *RequestDto (validated)
│   │   └── CreateDemandeRequestDto.php
│   └── Responses/               ← *ResponseDto (API contract)
│       └── DemandeResponseDto.php
├── Http/
│   ├── Controllers/             ← Controllers (RequestDto → Service → ResponseDto)
│   │   └── DemandeController.php
│   └── Resources/               ← API Resources (Model → ResponseDto mapping)
│       └── DemandeResource.php
├── Database/
│   └── Factories/               ← Test seeders
│       └── DemandeFactory.php
└── Models/Traits/               ← Shared traits (HasDateTime, HasAuditUser, etc.)
    └── HasDateTime.php

database/migrations/             ← Structure + indices + constraints
    └── 2024_01_01_000000_create_demandes_table.php
```

### Minimum rules

- **DTOs**: `readonly` classes (PHP 8.1+) · strict `RequestDto` / `ResponseDto` suffix · validation via `Validator::make()` in a static `fromRequest()`
- **API Resources**: extend `JsonResource` · `toArray()` returns the `ResponseDto`'s shape · map the Eloquent Model → DTO
- **Controllers**: receive a validated RequestDto → call a service/create a Model → return via a Resource · never a raw `return $model`
- **Eloquent Models**: explicit `$fillable` · `$casts` for dates/booleans · well-typed relations · traits for audit properties (HasDateTime, HasAuditUser)
- **Migrations**: indices on Status/Category/CreatedDate/ForeignKeys · MaxLength on strings · explicit enums · cascade delete on required one-to-one relations
- **Traits**: HasDateTime, HasAuditUser, HasDeadLine, HasAssignation, HasCode, HasSupervision — avoid duplication between Models
- **Sensitive fields**: `password`, `remember_token`, hashes, unneeded PII **excluded** from the Resource

### When to create DTOs/Migrations

- ✅ DTOs: every public REST endpoint, every queue handler, every complex form
- ✅ Migrations: indices (Status, CreatedDate, ForeignKeys), MaxLength, cascade delete, defaults

### Full detail

**Full structure (DTOs, Controllers, Models, Migrations, Traits, Resources)** → see the `dto-architect` skill.

## 🔒 Security guardrails — check on EVERY deliverable

- [ ] **Auth by default**: every route is authenticated unless explicitly justified (login, OAuth callback, signed webhook).
- [ ] **Authorization**: zone/ownership check before any read/write on a resource (Policy or `$user->zone_id === $zone_id`).
- [ ] **No raw Model**: responses via API Resource; never `passwordUser`, `remember_token`, tokens, hashes in the JSON.
- [ ] **Clean logs**: never a password, hash, token, or PII in plaintext in `Log::`. No `Hash::make()` for debug purposes.
- [ ] **Uploads**: `validate(['file' => 'required|file|mimes:...|max:...'])`; storage outside `public/`; sanitized filename.
- [ ] **Tokens**: Sanctum only, hashed tokens; never store a `plainTextToken`; `logout` revokes the current token (`$request->user()->currentAccessToken()->delete()`).
- [ ] **Reflection**: model + method in a whitelist, validated arguments, internal methods are `protected`/`private`.
- [ ] **Secrets**: no secret or private key in the repo; `.env`/`*.key` in `.gitignore`; values via `env()` with no sensitive default.
- [ ] **Docs**: Swagger protected in prod; no exposure of table structure.

## Optional input (if invoked from `backend-agent`)

If framework + version + functional description + stack are already provided: skip Phase 1.

## Workflow

### Phase 1 — Laravel context

```
Laravel Developer — Context:
1. What to build:
   [ ] CRUD endpoint            [ ] Auth (Sanctum)
   [ ] Model + relations        [ ] Middleware
   [ ] Migration                [ ] Mail / Notification
   [ ] Full feature             [ ] Generic dispatcher
2. Functional description: [what it should do]
3. Stack: [Sanctum? Socialite? Redis? Multi-DB? L5-Swagger?]
4. Available API: [relevant endpoint(s)]
```

> **Typical project note**: uses multi-DB connections (`mysql` + `legacy_application`), a custom `ApiKeyMiddleware`, a generic `ApiController` dispatcher, L5-Swagger annotations, camelCase naming with a domain suffix (`userName`, `userFirstName`).

### Phase 2 — Feature structure

> ⚠️ **Structure rule**: business logic in the Model (static methods for queries, instance methods for operations) · thin controllers that delegate to the Model · no Service layer, no Repository layer

```
app/
├── Http/
│   ├── Controllers/
│   │   └── FeatureController.php    # Thin controller — delegates to the Model
│   ├── Middleware/
│   │   └── ApiKeyMiddleware.php     # If API Key auth
│   └── Resources/
│       └── FeatureResource.php      # API Resource — never a raw Model in the response
├── Models/
│   └── Feature.php                  # Business logic + Eloquent queries
├── Mail/
│   └── FeatureMail.php              # If sending email
database/
├── migrations/
│   └── YYYY_MM_DD_HHMMSS_create_features_table.php
routes/
└── api.php                          # Routes with middleware
```

### Phase 3 — Eloquent model

> ⚠️ **Model rule**: explicit `$fillable` and `$casts` · explicit DB connection if secondary · static methods for complex queries (`getAll`, `findById`, `createWithRelations`) · scopes for reusable filters · transactions in multi-table methods
>
> ⚠️ **Visibility = security**: with dynamic routing, **every `public` method of a Model is a potential endpoint**. Internal helpers must be `protected`/`private`. Exposed methods must (a) appear in the `ApiController`'s whitelist, (b) receive validated arguments, (c) filter by the current user's zone.
>
> ⚠️ **Data isolation (`security-architect`, table-by-table discipline)**: any Model carrying
> an ownership column (`zone_id`, `tenant_id`, `user_id`...) applies a **Global Scope**
> rather than relying on a manually added `where()` on every query — a scope forgotten in
> a single method exposes the entire table. If the database is Postgres and the project
> requires it (high-risk multi-tenant), add native RLS as well in Phase 7 (migration).
> Full reference: `skills/security-architect/SKILL.md`, "Row-level data isolation"
> section.
>
> ```php
> protected static function booted(): void
> {
>     static::addGlobalScope(new ZoneScope); // never an isolated where() in a single method
> }
> ```

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * @OA\Schema(
 *     schema="Feature",
 *     title="Feature",
 *     type="object",
 *     required={"featureName", "featureStatus"},
 *     @OA\Property(property="id", type="integer", example=1),
 *     @OA\Property(property="featureName", type="string", example="Example"),
 *     @OA\Property(property="featureStatus", type="boolean", example=true),
 *     @OA\Property(property="zone_id", type="integer", example=42)
 * )
 */
class Feature extends Model
{
    protected $connection = 'legacy_application'; // Omit if default DB
    protected $table = 'features';

    protected $fillable = [
        'featureName',
        'featureDescription',
        'featureStatus',
        'zone_id',
        'created_by',
    ];

    protected $casts = [
        'featureStatus' => 'boolean',
        'zone_id' => 'integer',
    ];

    // ─── Relations ────────────────────────────────────────────────────────────

    public function zone(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'feature_tags', 'feature_id', 'tag_id');
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('featureStatus', true);
    }

    public function scopeByZone($query, int $zoneId)
    {
        return $query->where('zone_id', $zoneId);
    }

    // ─── Static methods (queries) ────────────────────────────────────

    public static function getAll(int $zoneId, ?int $paginate = null, ?string $search = null)
    {
        $query = self::active()
            ->byZone($zoneId)
            ->with(['zone', 'tags']);

        if ($search) {
            $query->where('featureName', 'like', "%{$search}%");
        }

        return $paginate ? $query->paginate($paginate) : $query->get();
    }

    public static function findById(int $id): ?self
    {
        return self::with(['zone', 'tags'])->find($id);
    }

    /**
     * @param array $featureData Feature data
     * @param array $tagIds Tag IDs to associate
     */
    public static function createWithRelations(array $featureData, array $tagIds = []): self
    {
        return DB::connection('legacy_application')->transaction(function () use ($featureData, $tagIds) {
            $feature = self::create($featureData);

            if (!empty($tagIds)) {
                $feature->tags()->attach($tagIds);
            }

            return $feature->load(['zone', 'tags']);
        });
    }

    // ─── Instance methods (operations) ────────────────────────────────────

    public function updateWithRelations(array $data, ?array $tagIds = null): self
    {
        return DB::connection('legacy_application')->transaction(function () use ($data, $tagIds) {
            $this->update($data);

            if ($tagIds !== null) {
                $this->tags()->sync($tagIds);
            }

            return $this->fresh(['zone', 'tags']);
        });
    }

    public static function deleteFeature(int $id): bool
    {
        return DB::connection('legacy_application')->transaction(function () use ($id) {
            $feature = self::findOrFail($id);
            $feature->tags()->detach();
            return $feature->delete();
        });
    }
}
```

### Phase 4 — API Resource

> ⚠️ **API Resource rule**: create a `JsonResource` for any Model containing sensitive fields or relations. Never return a raw Eloquent Model in a JSON response.

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class FeatureResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->featureName,
            'description' => $this->featureDescription,
            'status'      => $this->featureStatus,
            'zone_id'     => $this->zone_id,
            'tags'        => $this->whenLoaded('tags', fn () => $this->tags->pluck('name')),
            // never: passwordUser, remember_token, tokens, hashes, internal keys
        ];
    }
}
```

Usage in the Controller:
```php
return new FeatureResource($feature);           // single resource
return FeatureResource::collection($features);  // collection
```

### Phase 5 — Controller

> ⚠️ **Controller rule**: inline validation with `Validator::make()` or `$request->validate()` · JSON responses via **API Resource** (never a raw Model) · **systematic zone check**: any action on a resource carrying a `zone_id` must check `$request->user()->zone_id === $zone_id` (or via a Policy) before executing — the URL's `{zone_id}` is **never** an authorization · `try/catch` with `DB::rollBack()` if needed · `Log::` with context — **never a secret in logs** · `@OA\` annotations on every public method

```php
<?php

namespace App\Http\Controllers;

use App\Http\Resources\FeatureResource;
use App\Models\Feature;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class FeatureController extends Controller
{
    /**
     * @OA\Get(
     *     path="/api/{zone_id}/Feature/getAll",
     *     tags={"Features"},
     *     security={{"bearerAuth":{}}},
     *     summary="Retrieves all features for a zone",
     *     @OA\Parameter(name="zone_id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="search", in="query", @OA\Schema(type="string")),
     *     @OA\Response(response=200, description="List of features",
     *         @OA\JsonContent(type="array", @OA\Items(ref="#/components/schemas/Feature"))
     *     ),
     *     @OA\Response(response=401, description="Unauthorized"),
     *     @OA\Response(response=403, description="Zone not authorized")
     * )
     */
    public function getAll(Request $request, int $zone_id)
    {
        // Zone check — the URL parameter is not an authorization
        if ($request->user()->zone_id !== $zone_id) {
            return response()->json(['message' => 'Unauthorized access to this zone'], 403);
        }

        Log::info('Fetching features', ['zone_id' => $zone_id, 'search' => $request->search]);

        $features = Feature::getAll($zone_id, search: $request->search);

        return FeatureResource::collection($features);
    }

    /**
     * @OA\Post(
     *     path="/api/{zone_id}/Feature/create",
     *     tags={"Features"},
     *     security={{"bearerAuth":{}}},
     *     summary="Creates a new feature",
     *     @OA\Parameter(name="zone_id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\RequestBody(required=true,
     *         @OA\JsonContent(required={"featureName"},
     *             @OA\Property(property="featureName", type="string"),
     *             @OA\Property(property="featureDescription", type="string"),
     *             @OA\Property(property="tagIds", type="array", @OA\Items(type="integer"))
     *         )
     *     ),
     *     @OA\Response(response=201, description="Feature created",
     *         @OA\JsonContent(ref="#/components/schemas/Feature")
     *     ),
     *     @OA\Response(response=400, description="Validation failed"),
     *     @OA\Response(response=403, description="Zone not authorized"),
     *     @OA\Response(response=500, description="Server error")
     * )
     */
    public function create(Request $request, int $zone_id)
    {
        if ($request->user()->zone_id !== $zone_id) {
            return response()->json(['message' => 'Unauthorized access to this zone'], 403);
        }

        $validator = Validator::make($request->all(), [
            'featureName'          => 'required|string|max:255',
            'featureDescription'   => 'nullable|string',
            'tagIds'               => 'nullable|array',
            'tagIds.*'             => 'integer|exists:tags,id',
        ]);

        if ($validator->fails()) {
            Log::warning('Validation failed — creating feature', [
                'zone_id' => $zone_id,
                'errors' => $validator->errors()->toArray(),
            ]);
            return response()->json($validator->errors(), 400);
        }

        try {
            $feature = Feature::createWithRelations(
                array_merge($validator->validated(), ['zone_id' => $zone_id]),
                $request->tagIds ?? []
            );

            Log::info('Feature created', ['feature_id' => $feature->id, 'zone_id' => $zone_id]);
            return (new FeatureResource($feature))->response()->setStatusCode(201);

        } catch (\Throwable $e) {
            Log::error('Error creating feature', ['zone_id' => $zone_id, 'message' => $e->getMessage()]);
            return response()->json(['message' => 'An error occurred'], 500);
        }
    }

    /**
     * @OA\Delete(
     *     path="/api/delete/{zone_id}/Feature/{id}",
     *     tags={"Features"},
     *     security={{"bearerAuth":{}}},
     *     summary="Deletes a feature",
     *     @OA\Parameter(name="zone_id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *     @OA\Response(response=200, description="Feature deleted"),
     *     @OA\Response(response=403, description="Zone not authorized"),
     *     @OA\Response(response=404, description="Feature not found"),
     *     @OA\Response(response=500, description="Server error")
     * )
     */
    public function delete(Request $request, int $zone_id, int $id)
    {
        if ($request->user()->zone_id !== $zone_id) {
            return response()->json(['message' => 'Unauthorized access to this zone'], 403);
        }

        try {
            Feature::deleteFeature($id);
            Log::info('Feature deleted', ['feature_id' => $id, 'zone_id' => $zone_id]);
            return response()->json(['message' => 'Feature deleted successfully'], 200);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Feature not found'], 404);
        } catch (\Throwable $e) {
            Log::error('Error deleting feature', ['feature_id' => $id, 'message' => $e->getMessage()]);
            return response()->json(['message' => 'An error occurred'], 500);
        }
    }
}
```

### Phase 6 — Routes

> ⚠️ **Routing rule**: group by middleware · `/api/` prefix · `{zone_id}/{Model}/{method}` pattern · `throttle:300,1` on authenticated routes

```php
<?php

use App\Http\Controllers\FeatureController;
use App\Http\Middleware\ApiKeyMiddleware;
use Illuminate\Support\Facades\Route;

// Public routes with API Key
Route::middleware([ApiKeyMiddleware::class, 'throttle:300,1'])->group(function () {
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/register', [AuthController::class, 'register']);
});

// Authenticated routes (Sanctum)
Route::middleware(['auth:sanctum', 'throttle:300,1'])->group(function () {

    // Feature routes
    Route::get('/{zone_id}/Feature/getAll', [FeatureController::class, 'getAll']);
    Route::post('/{zone_id}/Feature/create', [FeatureController::class, 'create']);
    Route::put('/put/{zone_id}/Feature', [FeatureController::class, 'update']);
    Route::delete('/delete/{zone_id}/Feature/{id}', [FeatureController::class, 'delete']);

    // Generic authenticated route
    Route::get('/user', fn (Request $request) => $request->user());
});
```

### Phase 7 — Migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'legacy_application'; // Omit if default DB

    public function up(): void
    {
        Schema::connection($this->connection)->create('features', function (Blueprint $table) {
            $table->id();
            $table->string('featureName', 255);
            $table->text('featureDescription')->nullable();
            $table->boolean('featureStatus')->default(true);
            $table->unsignedBigInteger('zone_id');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('zone_id')->references('id')->on('zones')->onDelete('cascade');
            $table->index('zone_id');
            $table->index('featureStatus');
        });
    }

    public function down(): void
    {
        Schema::connection($this->connection)->dropIfExists('features');
    }
};
```

> ⚠️ **Postgres RLS (complements the Global Scope, high-risk multi-tenant)**: if the database is
> Postgres and application-level isolation alone (Global Scope, Phase 3) isn't enough, enable
> native RLS on the table:
> ```sql
> ALTER TABLE features ENABLE ROW LEVEL SECURITY;
> CREATE POLICY features_zone_isolation ON features
>   USING (zone_id = current_setting('app.current_zone_id')::bigint);
> ```
> Reference: `skills/security-architect/SKILL.md`, "Row-level data isolation" section.

### Phase 8 — PHPUnit tests

> ⚠️ **Testing rule**: PHPUnit (not Pest) · `Test.php` suffix · inherit from `Tests\TestCase` · Feature tests for endpoints, Unit tests for Model logic

```php
<?php

namespace Tests\Feature;

use App\Models\Feature;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeatureTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_get_all_features_for_zone(): void
    {
        $response = $this->getJson('/api/1/Feature/getAll');

        $response->assertStatus(200)
                 ->assertJsonStructure(['*' => ['id', 'name', 'status']]);
    }

    public function test_create_feature_requires_name(): void
    {
        $response = $this->postJson('/api/1/Feature/create', []);

        $response->assertStatus(400)
                 ->assertJsonValidationErrors(['featureName']);
    }

    public function test_can_create_feature_with_valid_data(): void
    {
        $data = [
            'featureName' => 'Test Feature',
            'featureDescription' => 'Test description',
        ];

        $response = $this->postJson('/api/1/Feature/create', $data);

        $response->assertStatus(201)
                 ->assertJsonFragment(['name' => 'Test Feature']);
    }
}
```

### Phase 9 — Invisible Button UX pattern (Filament 4)

> **Mandatory rule** for every Filament `Table` with an actions column.

> **Editable legal pages (ToS, privacy policy, GDPR, cookies)**: the full pattern
> (`legal_documents` migration, versioned `LegalDocument` Model, Filament Resource with
> publication history) is documented in `skills/legal-pages/SKILL.md` Phase 3g — don't
> duplicate it here, invoke it from this skill if the project needs editable legal content.

In data grids, action buttons repeated on every row create visual noise. Systematically apply the **Invisible Button** (IB) pattern.

**Filament 4 rules:**
- **All** row actions are **secondary by default** — hidden at rest, revealed on hover. There's no longer a "primary always visible" distinction.
- `->iconOnly()` is **mandatory** on every row action: no text label, icon only.
- The `->critical()` macro is no longer a standard choice — every button appears on hover.
- The **Actions column is sticky to the right** (`position: sticky; right: 0`) — applied globally via shared CSS. No separator border.

**Shared infrastructure (monorepo):**

| Artifact | Path |
|---|---|
| Sticky + opacity CSS | `shared/monorepo-common/resources/css/invisible-button.css` |
| Trait to use | `shared/monorepo-common/src/Filament/Concerns/HasInvisibleRowActions.php` |
| ServiceProvider (macros) | `shared/monorepo-common/src/Providers/InvisibleButtonServiceProvider.php` |

**Implementation in a `*Table.php`:**

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

**Default visible columns:**
- Before implementing a table, ask the PO/user which columns should be visible by default.
- Rule: a maximum of **4–5 visible columns**. Secondary columns (dates, slugs, technical IDs, locales) are hidden:

```php
->toggleable(isToggledHiddenByDefault: true)
```

The user can show them again via Filament's native "Toggle columns" button.

### Phase 10 — Conditional persistence

- **If invoked from `backend-agent`**: return the artifacts in Markdown.
- **If invoked standalone**: write the files directly into `app/` and `database/`.

### Phase 12 — Memory

> ⚠️ Skip if invoked from `backend-agent`.

Record in `<project>/.claude/backend-knowledge.md`: Laravel version + packages + project conventions + DB connection pattern.
