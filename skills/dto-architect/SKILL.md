---
name: dto-architect
description: "DTO Architect — source of truth for designing and using Data Transfer Objects across the whole stack (backend Laravel/.NET, frontend Angular/React, mobile Flutter/React Native, REST/GraphQL/Kafka integration). Defines placement, naming, validation, Entity↔DTO mapping, and the DTO/domain Model separation. Auto-invoke on: DTO, Data Transfer Object, Request/Response payload, API contract, entity mapping, ViewModel, Freezed, Zod, io-ts, class-validator, FluentValidation of a DTO."
model: claude-sonnet-5
user-invocable: true
type: utility
priority: high
scope: cross
dependencies:
  - context7-mcp
conflicts: []
---

# DTO Architect

`[Activated: DTO Architect]`

**Single** source of truth for everything DTO-related across the stack. The dev skills (`laravel-developer`, `dotnet-developer`, `angular-developer`, `react-developer`, `flutter-developer`, `react-native-developer`, `integration-developer`) delegate here when they need to create or use a DTO.

> **Absolute rule**: a DTO is **never** a persistence entity or a domain model. It represents **a transport contract** at a point in time. Two strict directions: `RequestDto` (input) and `ResponseDto` (output). Exposing a raw entity in an API response is a **bug** — always go through a DTO or a Resource.

## Why a dedicated skill rather than inline in each skill

- DTO conventions are **cross-cutting** — repeating them in 8 skills guarantees duplication and drift.
- The backend and frontend contracts must **match exactly** (field names, types, nullability). A pivot skill avoids divergence.
- A convention change (e.g. camelCase → snake_case) propagates from a single place.

## Core principles (apply everywhere)

1. **One DTO = one directional contract** — never reuse a `UserRequestDto` as a response or vice versa.
2. **DTO ≠ domain Model** — the DTO is flat, serializable, with no business logic or methods. The Model carries the logic.
3. **DTO ≠ persistence entity** — never return an Eloquent `User`, an EF `UserDbEntity`, a Mongo `UserDocument` directly.
4. **Validation at the edge** — validation lives on the `RequestDto` (.NET FluentValidation, Laravel Validator, React Zod, Flutter Freezed+guards, NestJS class-validator).
5. **Explicit mapping** — a dedicated mapper (static .NET / Laravel API Resource / pure frontend function) does the Entity ↔ DTO conversion. No mapping scattered across controllers.
6. **Version by duplication, not mutation** — `UserResponseDtoV2` coexists with `UserResponseDto` during migration; never a "temporary" optional field left hanging.
7. **Frontend: transport DTO ≠ UI Model** — the DTO received from the API is immediately mapped to a UI Model (with parsed dates, computed properties, defaults). The component **never** touches the raw DTO.

## Folder convention — standard per framework

### Backend Laravel

#### Folder structure

```
app/
├── Models/                       ← Eloquent Models (never exposed directly in the API)
│   ├── User.php
│   └── Demande.php
├── DTOs/
│   ├── Requests/                ← *RequestDto (validated API inputs)
│   │   ├── CreateUserRequestDto.php
│   │   ├── UpdateUserRequestDto.php
│   │   └── CreateDemandeRequestDto.php
│   └── Responses/               ← *ResponseDto (API outputs)
│       ├── UserResponseDto.php
│       ├── UserListResponseDto.php
│       └── DemandeResponseDto.php
├── Http/
│   ├── Controllers/             ← Controllers (receive RequestDto, return ResponseDto)
│   │   └── UserController.php
│   └── Resources/               ← API Resources (Model → ResponseDto mapping)
│       └── UserResource.php
├── Database/
│   ├── Migrations/              ← Structure + constraints
│   │   └── 2024_01_01_000000_create_users_table.php
│   └── Factories/               ← Test seeders
│       └── UserFactory.php
└── Validators/                  ← Custom ValidationRules (optional)
    └── DemandeValidationRules.php

database/
└── migrations/                  ← Modern alternative (since Laravel 11)
    └── 2024_01_01_000000_create_users_table.php
```

#### DTOs — Plain PHP classes

```php
// app/DTOs/Requests/CreateDemandeRequestDto.php
namespace App\DTOs\Requests;

use Carbon\Carbon;

readonly class CreateDemandeRequestDto
{
    public function __construct(
        public string $title,
        public string $what,
        public string $status,
        public bool $importance,
        public bool $isUrgent,
        public Carbon $whenFromDate,
        public ?Carbon $whenToDate,
        public string $sourceId,
        public string $zoneId,
        public string $requesterId,
        public string $addressId,
        public string $category,
    ) {}

    /**
     * Validate and create from HTTP request
     */
    public static function fromRequest(\Illuminate\Http\Request $request): self
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'what' => 'required|string|max:5000',
            'status' => 'required|string|in:pending,assigned,completed',
            'importance' => 'required|boolean',
            'isUrgent' => 'required|boolean',
            'whenFromDate' => 'required|date_format:Y-m-d H:i:s',
            'whenToDate' => 'nullable|date_format:Y-m-d H:i:s|after:whenFromDate',
            'sourceId' => 'required|uuid|exists:sources,id',
            'zoneId' => 'required|uuid|exists:zones,id',
            'requesterId' => 'required|uuid|exists:requesters,id',
            'addressId' => 'required|uuid|exists:addresses,id',
            'category' => 'required|string|in:none,urgent,standard',
        ]);

        return new self(
            title: $validated['title'],
            what: $validated['what'],
            status: $validated['status'],
            importance: $validated['importance'],
            isUrgent: $validated['isUrgent'],
            whenFromDate: Carbon::parse($validated['whenFromDate']),
            whenToDate: isset($validated['whenToDate']) ? Carbon::parse($validated['whenToDate']) : null,
            sourceId: $validated['sourceId'],
            zoneId: $validated['zoneId'],
            requesterId: $validated['requesterId'],
            addressId: $validated['addressId'],
            category: $validated['category'],
        );
    }
}

// app/DTOs/Responses/DemandeResponseDto.php
namespace App\DTOs\Responses;

use Carbon\Carbon;

readonly class DemandeResponseDto
{
    public function __construct(
        public string $id,
        public string $title,
        public string $what,
        public string $status,
        public bool $importance,
        public bool $isUrgent,
        public Carbon $whenFromDate,
        public ?Carbon $whenToDate,
        public Carbon $createdDate,
        public ?Carbon $updatedDate,
        public string $sourceId,
        public string $zoneId,
        public string $requesterId,
        public string $addressId,
        public string $category,
        public ?string $createdBy = null,
        public ?string $updatedBy = null,
    ) {}
}
```

#### API Resources — Model → ResponseDto mapping

```php
// app/Http/Resources/DemandeResource.php
namespace App\Http\Resources;

use App\DTOs\Responses\DemandeResponseDto;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DemandeResource extends JsonResource
{
    /**
     * Transform the model into a DemandeResponseDto
     */
    public function toArray(Request $request): array
    {
        /** @var \App\Models\Demande $this */
        return (new DemandeResponseDto(
            id: $this->id,
            title: $this->title,
            what: $this->what,
            status: $this->status,
            importance: $this->importance,
            isUrgent: $this->is_urgent,
            whenFromDate: $this->when_from_date,
            whenToDate: $this->when_to_date,
            createdDate: $this->created_at,
            updatedDate: $this->updated_at,
            sourceId: $this->source_id,
            zoneId: $this->zone_id,
            requesterId: $this->requester_id,
            addressId: $this->address_id,
            category: $this->category,
            createdBy: $this->created_by,
            updatedBy: $this->updated_by,
        ))->toArray();  // Convert DTO to array for JSON response
    }
}
```

#### Controllers

```php
// app/Http/Controllers/DemandeController.php
namespace App\Http\Controllers;

use App\DTOs\Requests\CreateDemandeRequestDto;
use App\DTOs\Responses\DemandeResponseDto;
use App\Http\Resources\DemandeResource;
use App\Models\Demande;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DemandeController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        // 1. Validate + build the input DTO
        $dto = CreateDemandeRequestDto::fromRequest($request);

        // 2. Call the service (or create the model directly)
        $demande = Demande::create([
            'title' => $dto->title,
            'what' => $dto->what,
            'status' => $dto->status,
            'importance' => $dto->importance,
            'is_urgent' => $dto->isUrgent,
            'when_from_date' => $dto->whenFromDate,
            'when_to_date' => $dto->whenToDate,
            'source_id' => $dto->sourceId,
            'zone_id' => $dto->zoneId,
            'requester_id' => $dto->requesterId,
            'address_id' => $dto->addressId,
            'category' => $dto->category,
            'created_by' => auth()->id(),
        ]);

        // 3. Return via API Resource (produces ResponseDto)
        return response()->json(
            DemandeResource::make($demande),
            201
        );
    }

    public function show(string $id): JsonResponse
    {
        $demande = Demande::findOrFail($id);
        
        // Never: return response()->json($demande);
        // Always: via Resource
        return response()->json(DemandeResource::make($demande));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $demande = Demande::findOrFail($id);
        
        $dto = CreateDemandeRequestDto::fromRequest($request);
        $demande->update([
            'title' => $dto->title,
            'what' => $dto->what,
            'status' => $dto->status,
            // ... etc
        ]);

        return response()->json(DemandeResource::make($demande));
    }
}
```

#### Eloquent Models

```php
// app/Models/Demande.php
namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Demande extends Model
{
    protected $fillable = [
        'title',
        'what',
        'status',
        'importance',
        'is_urgent',
        'when_from_date',
        'when_to_date',
        'source_id',
        'zone_id',
        'requester_id',
        'address_id',
        'category',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'importance' => 'boolean',
        'is_urgent' => 'boolean',
        'when_from_date' => 'datetime',
        'when_to_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relations
    public function source(): BelongsTo
    {
        return $this->belongsTo(Source::class, 'source_id');
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class, 'zone_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(Requester::class, 'requester_id');
    }

    public function address(): HasOne
    {
        return $this->hasOne(Address::class, 'demande_id');
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_user_id');
    }

    public function createdUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function supervisedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervised_user_id');
    }

    public function missions(): HasMany
    {
        return $this->hasMany(Mission::class, 'demande_id');
    }

    public function responses(): HasMany
    {
        return $this->hasMany(DemandeResponse::class, 'demande_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(DemandeComment::class, 'demande_id');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(DemandeHistory::class, 'demande_id');
    }
}
```

#### Migrations — Structure + Constraints

```php
// database/migrations/2024_01_01_000000_create_demandes_table.php
namespace Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demandes', function (Blueprint $table) {
            // Primary key
            $table->uuid('id')->primary();

            // Audit fields (IHasDateTime, IHasAuditUser)
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
            $table->uuid('created_by')->nullable();
            $table->uuid('updated_by')->nullable();

            // Deadline (IDeadLine)
            $table->timestamp('due_date')->nullable();

            // Assignation (IAssignation)
            $table->timestamp('assigned_date')->nullable();
            $table->uuid('assigned_user_id')->nullable();

            // Code (ICode)
            $table->string('code')->unique();

            // Supervision (ISupervision)
            $table->timestamp('supervised_date')->nullable();
            $table->uuid('supervised_user_id')->nullable();

            // Demande data
            $table->string('title', 255)->index();  // Index for frequent filtering
            $table->enum('status', ['pending', 'assigned', 'completed'])->index();  // Index for filtering
            $table->boolean('importance')->default(false);
            $table->boolean('is_urgent')->default(false);
            $table->timestamp('when_from_date');  // Index for range queries
            $table->timestamp('when_to_date')->nullable();
            $table->longText('what');  // Large text
            $table->enum('category', ['none', 'urgent', 'standard'])->default('none')->index();

            // Foreign keys
            $table->uuid('source_id')->index();
            $table->uuid('zone_id')->index();
            $table->uuid('requester_id')->nullable()->index();
            $table->uuid('address_id')->unique();  // Unique for one-to-one

            // Indexes for performance
            $table->index(['created_date']);
            $table->index(['zone_id', 'status']);
            $table->index(['assigned_user_id']);

            // Foreign key constraints
            $table->foreign('source_id')->references('id')->on('sources')->cascadeOnDelete();
            $table->foreign('zone_id')->references('id')->on('zones')->cascadeOnDelete();
            $table->foreign('requester_id')->references('id')->on('requesters')->nullOnDelete();
            $table->foreign('address_id')->references('id')->on('addresses')->cascadeOnDelete();
            $table->foreign('assigned_user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();
            $table->foreign('supervised_user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demandes');
    }
};
```

#### Traits — Shared interfaces (alternative to .NET interfaces)

```php
// app/Models/Traits/HasDateTime.php
namespace App\Models\Traits;

use Carbon\Carbon;

trait HasDateTime
{
    public function getCreatedDateAttribute(): Carbon
    {
        return $this->created_at;
    }

    public function getUpdatedDateAttribute(): ?Carbon
    {
        return $this->updated_at;
    }
}

// app/Models/Traits/HasAuditUser.php
namespace App\Models\Traits;

trait HasAuditUser
{
    public function getCreatedByAttribute()
    {
        return $this->attributes['created_by'] ?? null;
    }

    public function getUpdatedByAttribute()
    {
        return $this->attributes['updated_by'] ?? null;
    }
}

// app/Models/Demande.php — using the traits
class Demande extends Model
{
    use HasDateTime, HasAuditUser;
    // ...
}
```

- `RequestDto`s are **plain PHP classes** (readonly) with typed properties + a static `fromRequest(Request $r)` method that calls `Validator::make()` and instantiates.
- `ResponseDto`s are produced by **API Resources** (`toArray()` returns the `ResponseDto` shape).
- **Eloquent Models** are mapped to migrations with indices and constraints.
- **Traits** avoid duplicating audit properties (HasDateTime, HasAuditUser) — the .NET `IHasDateTime` alternative.
- Accepted alternative: use [`spatie/laravel-data`](https://spatie.be/docs/laravel-data) for strict typing — in that case Data classes live in `app/DTOs/`.

### Backend .NET (Clean Architecture)

```
src/
├── Application/
│   └── DTOs/
│       ├── Requests/     ← *RequestDto (with FluentValidation)
│       │   ├── CreateUserRequestDto.cs
│       │   └── CreateUserRequestDtoValidator.cs
│       └── Responses/    ← *ResponseDto
│           ├── UserResponseDto.cs
│           └── UserListResponseDto.cs
├── Application/
│   └── Mappers/          ← Static Entity → DTO mappers
│       └── UserMapper.cs
├── Domain/               ← Business entities (never exposed)
└── Infrastructure/
    └── Persistence/
        └── Entities/     ← EF Core *DbEntity (never exposed)
```

- `RequestDto` = immutable C# `record`s, validated via `AbstractValidator<T>` FluentValidation in the same folder.
- `ResponseDto` = immutable C# `record`s, built via `UserMapper.ToDto(entity)` — LINQ projections `Expression<Func<UserDbEntity, UserResponseDto>>` to avoid materialization.
- **Mandatory** suffix `RequestDto` / `ResponseDto` (not `UserDto` alone — ambiguous).

### Frontend Angular

```
src/app/
├── core/
│   └── dtos/                ← Transport DTOs (mirrors the backend)
│       ├── user-request.dto.ts
│       └── user-response.dto.ts
├── core/
│   └── models/              ← UI Models (with parsed dates, computed)
│       └── user.model.ts
├── core/
│   └── mappers/             ← Pure DTO ↔ Model functions
│       └── user.mapper.ts
└── features/user/
    └── services/
        └── user-api.service.ts   ← Signature: Observable<UserResponseDto> then map(userMapper.toModel)
```

- DTOs = TypeScript `interface`s, all fields **explicit** (no `[key: string]: any`).
- User input validation via Reactive Forms + validators — not on the DTO itself (the DTO is a contract).
- API services return the raw DTO; the mapper converts to a UI Model **before** entering the NGXS store or the component.

### Frontend React

```
src/
├── dtos/                    ← Transport DTOs (mirrors the backend)
│   ├── user-request.dto.ts
│   └── user-response.dto.ts
├── models/                  ← UI Models (post-mapping)
│   └── user.model.ts
├── schemas/                 ← Zod schemas (runtime validation + type inference)
│   └── user.schema.ts
├── mappers/                 ← Pure DTO ↔ Model functions
│   └── user.mapper.ts
└── features/user/
    └── api/
        └── user-api.ts      ← TanStack Query: queryFn parses via Zod then maps
```

- **Zod mandatory**: the DTO received from the API is parsed by a Zod schema (`UserResponseDtoSchema.parse(data)`). Type = `z.infer<typeof Schema>`. This catches backend/frontend divergence at runtime.
- The Zustand store holds **UI Models**, never DTOs.

### Mobile Flutter

```
lib/
├── data/
│   ├── dtos/                ← DTOs (via Freezed + json_serializable)
│   │   ├── user_request_dto.dart
│   │   └── user_response_dto.dart
│   └── mappers/
│       └── user_mapper.dart
├── domain/
│   ├── models/              ← Immutable domain Models (Freezed)
│   │   └── user.dart
│   └── repositories/        ← Signature: Future<User>, never Future<UserResponseDto>
└── presentation/            ← Only knows domain Models
```

- Freezed + `@JsonSerializable()` mandatory for all DTOs (fromJson/toJson generated).
- Repositories expose **domain Models** — the mapper lives in the repository (not in the BLoC/Riverpod).

### Mobile React Native

```
src/
├── dtos/                    ← Mirrors the backend
│   ├── user-request.dto.ts
│   └── user-response.dto.ts
├── models/                  ← Domain Models
│   └── user.model.ts
├── schemas/                 ← Zod (runtime validation)
│   └── user.schema.ts
└── mappers/
    └── user.mapper.ts
```

- Same rules as React (Zod parses at the API boundary).

### DbEntity — .NET persistence layer only

**Core rule**: `DbEntity`s are **internal to the Application/Infrastructure layer**. Never exposed in the API or frontend. Only used for the ORM (EF Core).

#### Standard .NET structure (Clean Architecture)

```
src/
├── Domain/                    ← Business logic (no DbEntity)
│   ├── Entities/              ← Business entities (POCO, no ORM awareness)
│   │   └── User.cs            ← pure business object
│   └── Aggregates/
├── Application/               ← Use cases
│   ├── DTOs/
│   │   ├── Requests/
│   │   └── Responses/
│   └── Mappers/
├── Infrastructure/            ← ORM, persistence
│   ├── Persistence/
│   │   ├── Entities/          ← *DbEntity (EF Core aware)
│   │   │   ├── UserDbEntity.cs
│   │   │   └── DemandeDbEntity.cs
│   │   ├── Configurations/    ← Entity mappings (Fluent API)
│   │   │   └── UserDbEntityConfiguration.cs
│   │   ├── Interfaces/        ← Shared interfaces
│   │   │   ├── IHasDateTime.cs
│   │   │   ├── IHasAuditUser.cs
│   │   │   ├── IDeadLine.cs
│   │   │   └── IAssignation.cs
│   │   └── DbContext.cs
│   └── Repositories/          ← Abstraction over DbEntity
│       └── UserRepository.cs
└── Api/
    └── Controllers/           ← Expose ONLY DTOs
```

#### Shared interfaces (example from a DemandeDbEntity)

```csharp
// Infrastructure/Persistence/Interfaces/IHasDateTime.cs
public interface IHasDateTime {
    DateTime CreatedDate { get; set; }
    DateTime? UpdatedDate { get; set; }
}

// Infrastructure/Persistence/Interfaces/IHasAuditUser.cs
public interface IHasAuditUser {
    Guid? CreatedBy { get; set; }
    Guid? UpdatedBy { get; set; }
}

// Infrastructure/Persistence/Interfaces/IDeadLine.cs
public interface IDeadLine {
    DateTime? DueDate { get; set; }
}

// Infrastructure/Persistence/Interfaces/IAssignation.cs
public interface IAssignation {
    DateTime? AssignedDate { get; set; }
    Guid? AssignedUserId { get; set; }
}

// Infrastructure/Persistence/Interfaces/ICode.cs
public interface ICode {
    string Code { get; set; }
}

// Infrastructure/Persistence/Interfaces/ISupervision.cs
public interface ISupervision {
    DateTime? SupervisedDate { get; set; }
    Guid? SupervisedUserId { get; set; }
}
```

Composition: `DemandeDbEntity : KeyDbEntity, IHasDateTime, IHasAuditUser, IDeadLine, IAssignation, ICode, ISupervision { ... }`

#### DbEntity — Design directives

1. **Mandatory `DbEntity` suffix** (never `Entity`, never `Domain<T>`) — to avoid confusion with business entities.
2. **Inherits from a `KeyDbEntity` base**: holds the ID (`Guid Id`), the primary key.
3. **Shared properties via interfaces**: `IHasDateTime`, `IHasAuditUser`, etc. — avoids duplication.
4. **Column properties**: all fields mapped with EF Core using `[Column]` / Fluent API when needed.
5. **Navigation properties**: EF Core relations (`public virtual AddressDbEntity Address`), documented with `/// <summary>`.
6. **Collections**: declared as `ICollection<T>` or enumerables (never a List that exposes `Add()` publicly).
7. **Constructor**: default by default, parameterized if complex (never implicitly create children — lazy load).
8. **No business logic** — the DbEntity is an ORM data container. Logic lives in Domain or Application.
9. **Enums**: `DbEnum` suffix (e.g. `DemandeStatusDbEnum`) — distinct from business enums.
10. **Null-safety**: `public string Title { get; set; } = string.Empty;` — avoids a null dereference at runtime.

#### Example: DemandeDbEntity

```csharp
namespace MonOrg.Backend.Demande.Domain;

/// <summary>
/// This class owns the data of an incoming demande.
/// EF Core entity — never exposed directly in API.
/// </summary>
public class DemandeDbEntity : KeyDbEntity, 
    IHasDateTime, 
    IHasAuditUser, 
    IDeadLine, 
    IAssignation, 
    ICode, 
    ISupervision
{
    #region Properties (Implemented via Interfaces)
    
    public DateTime CreatedDate { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime? AssignedDate { get; set; }
    public Guid? AssignedUserId { get; set; }
    public string Code { get; set; } = string.Empty;
    public DateTime? SupervisedDate { get; set; }
    public Guid? SupervisedUserId { get; set; }
    
    #endregion
    
    #region Properties (Domain Columns)
    
    /// <summary>The title of the demande.</summary>
    public string Title { get; set; } = string.Empty;
    
    /// <summary>The status of the demande.</summary>
    public DemandeStatusDbEnum Status { get; set; }
    
    /// <summary>Is this demande important?</summary>
    public bool Importance { get; set; }
    
    /// <summary>Is this urgent? (If yes, not for this app service.)</summary>
    public bool IsUrgent { get; set; }
    
    /// <summary>Start date (UTC). 18-02-2026 00:00 → 17-02-2026 23:00 UTC.</summary>
    public DateTime WhenFromDate { get; set; }
    
    /// <summary>End date (UTC, nullable for punctual events).</summary>
    public DateTime? WhenToDate { get; set; }
    
    /// <summary>Explanation text.</summary>
    public string What { get; set; } = string.Empty;
    
    /// <summary>Source identifier (FK).</summary>
    public Guid SourceId { get; set; }
    
    /// <summary>Zone identifier (FK).</summary>
    public Guid ZoneId { get; set; }
    
    /// <summary>Requester identifier (FK).</summary>
    public Guid RequesterId { get; set; }
    
    /// <summary>Address identifier (FK).</summary>
    public Guid AddressId { get; set; }
    
    /// <summary>Category of the demande.</summary>
    public DemandeCategoryDbEnum Category { get; set; }
    
    #endregion
    
    #region Navigation Properties
    
    /// <summary>The address linked to this demande.</summary>
    public virtual AddressDbEntity Address { get; set; } = null!;
    
    /// <summary>The source (email, phone, etc.).</summary>
    public virtual SourceDbEntity Source { get; set; } = null!;
    
    /// <summary>The zone.</summary>
    public virtual ZoneDbEntity Zone { get; set; } = null!;
    
    /// <summary>The requester (nullable, might be unknown).</summary>
    public virtual RequesterDbEntity? Requester { get; set; }
    
    /// <summary>The user assigned to this demande.</summary>
    public virtual UserDbEntity? AssignedUser { get; set; }
    
    /// <summary>The user who created this demande.</summary>
    public virtual UserDbEntity CreatedUser { get; set; } = null!;
    
    /// <summary>The supervisor user.</summary>
    public virtual UserDbEntity? SupervisorUsers { get; set; }
    
    /// <summary>Associated missions.</summary>
    public ICollection<MissionDbEntity> Missions { get; set; } = [];
    
    /// <summary>AI-generated responses.</summary>
    public ICollection<DemandeResponseDbEntity> Responses { get; set; } = [];
    
    /// <summary>AI-generated summary.</summary>
    public DemandeSummaryDbEntity Summary { get; set; } = null!;
    
    /// <summary>Associated comments.</summary>
    public ICollection<DemandeCommentDbEntity> Comments { get; set; } = [];
    
    /// <summary>Audit trail of actions performed.</summary>
    public ICollection<DemandeHistoryDbEntity> Histories { get; set; } = [];
    
    /// <summary>Links where this demande has the smaller GUID (canonical source).</summary>
    public ICollection<DemandeLinkDbEntity> LeftDemandeLinks { get; set; } = [];
    
    /// <summary>Links where this demande has the larger GUID (canonical target).</summary>
    public ICollection<DemandeLinkDbEntity> RightDemandeLinks { get; set; } = [];
    
    /// <summary>All links involving this demande (convenience property).</summary>
    public IEnumerable<DemandeLinkDbEntity> AllDemandeLinks =>
        (LeftDemandeLinks ?? []).Concat(RightDemandeLinks ?? []);
    
    #endregion
}
```

**Key point**: this DbEntity lives **only** in Infrastructure/Persistence. The controller turns it into a `DemandeResponseDto` via a static mapper, never a direct return.

#### Mapper from DbEntity to DTO

```csharp
// Application/Mappers/DemandeMapper.cs
public static class DemandeMapper {
    public static readonly Expression<Func<DemandeDbEntity, DemandeResponseDto>> ToDtoProjection =
        s => new DemandeResponseDto(
            Id: s.Id,
            Title: s.Title,
            Status: s.Status.ToString(),  // Enum → string for the DTO
            Importance: s.Importance,
            IsUrgent: s.IsUrgent,
            WhenFromDate: s.WhenFromDate,
            WhenToDate: s.WhenToDate,
            What: s.What,
            Code: s.Code,
            CreatedDate: s.CreatedDate,
            UpdatedDate: s.UpdatedDate,
            DueDate: s.DueDate,
            AssignedDate: s.AssignedDate,
            AssignedUserId: s.AssignedUserId,
            SupervisedDate: s.SupervisedDate,
            SupervisedUserId: s.SupervisedUserId,
            // NEVER include raw navigations:
            // Source = s.Source,  ← BUG! exposes the entire hierarchy
            // Address = s.Address,
            // Instead, use nested DTOs or IDs
            SourceId: s.SourceId,
            ZoneId: s.ZoneId,
            RequesterId: s.RequesterId,
            AddressId: s.AddressId,
            Category: s.Category.ToString(),
            CreatedBy: s.CreatedBy,
            UpdatedBy: s.UpdatedBy
        );
    
    public static DemandeResponseDto ToDto(DemandeDbEntity entity) =>
        ToDtoProjection.Compile()(entity);
}
```

### Integration (integration-developer / integration-agent)

```
src/
├── contracts/               ← Versioned API contracts (OpenAPI/JSON Schema/Avro/Protobuf)
│   ├── v1/
│   │   ├── user-created.event.json
│   │   └── user-response.dto.json
│   └── v2/
├── dtos/                    ← DTOs generated from the contracts (openapi-generator, avrogen)
│   └── generated/
└── mappers/                 ← Anti-Corruption Layer between systems
```

- **Contract-first** is mandatory: the schema (OpenAPI/AsyncAPI/Avro) is the source; DTOs are **generated**, never hand-written.
- Strict versioning: never break an existing contract, create `v2/`.
- Kafka: Avro DTOs in a Schema Registry; the producer validates before publishing.

## Naming — universal rules

| Type                | Suffix            | Example                            |
|---------------------|-------------------|------------------------------------|
| Input DTO        | `RequestDto`      | `CreateUserRequestDto`             |
| Output DTO       | `ResponseDto`     | `UserResponseDto`                  |
| Event DTO     | `EventDto`        | `UserCreatedEventDto`              |
| Paginated DTO          | `PagedResponseDto`| `UserPagedResponseDto`             |
| UI Model (frontend) | (no suffix)   | `User` (in `models/user.model.ts`) |

Forbidden: `UserDto` (ambiguous), `UserVM` (ambiguous), `IUser` with a prefixed `I` (except .NET for interfaces), `TUser` (Hungarian prefix).

## Using it wisely — when to create a DTO

| Situation                                          | DTO required? |
|---------------------------------------------------|-------------------|
| Public API endpoint (REST/GraphQL)                | ✅ Yes            |
| CQRS handler (Command/Query)                      | ✅ Yes            |
| Kafka/RabbitMQ message                            | ✅ Yes            |
| Frontend HTTP call                          | ✅ Yes            |
| Complex frontend form (>3 fields)     | ✅ Yes (as a Request) |
| Return value of an internal private method               | ❌ No — direct domain Model |
| Pure utility function                          | ❌ No            |
| Unit test (fixtures)                          | ✅ Yes for API payloads |

**Forbidden**:
- Passing a `RequestDto` to an internal service method — the controller unwraps the DTO and passes primitive parameters or a domain Model.
- Serializing a domain Model as JSON (use a `ResponseDto`).
- Mutating a DTO — they are **immutable** (C# record, readonly TS, Dart Freezed, PHP 8.1+ readonly properties).

## Mapping — patterns per stack

### Laravel

```php
// app/Http/Resources/UserResource.php
class UserResource extends JsonResource {
    public function toArray($request): array {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'displayName' => $this->display_name,
            'createdAt' => $this->created_at?->toIso8601String(),
            // ❌ never 'password', 'remember_token', 'zone_secret'
        ];
    }
}
// Controller:
return UserResource::make($user); // produces a UserResponseDto
```

### .NET

```csharp
// Application/Mappers/UserMapper.cs
public static class UserMapper {
    public static readonly Expression<Func<UserDbEntity, UserResponseDto>> ToDtoProjection = u =>
        new UserResponseDto(u.Id, u.Email, u.DisplayName, u.CreatedAt);

    public static UserResponseDto ToDto(UserDbEntity e) => ToDtoProjection.Compile()(e);
}
// EF Core usage (projection, no materialization):
var users = await _db.Users.Select(UserMapper.ToDtoProjection).ToListAsync();
```

### Angular / React / React Native

```ts
// mappers/user.mapper.ts
export const userMapper = {
  toModel: (dto: UserResponseDto): User => ({
    id: dto.id,
    email: dto.email,
    displayName: dto.displayName,
    createdAt: new Date(dto.createdAt),   // ISO string → Date
    isRecent: Date.now() - Date.parse(dto.createdAt) < 86400000, // computed
  }),
  toCreateRequest: (form: UserFormValue): CreateUserRequestDto => ({
    email: form.email.trim().toLowerCase(),
    displayName: form.displayName.trim(),
  }),
};
```

### Flutter

```dart
// data/mappers/user_mapper.dart
extension UserDtoX on UserResponseDto {
  User toDomain() => User(
    id: id,
    email: email,
    displayName: displayName,
    createdAt: DateTime.parse(createdAt),
  );
}
```

## EF Core Configuration — .NET constraints and performance

**Core rule**: EF Core configuration (indices, lengths, enum conversions, relations, collations) is **critical** for performance and data integrity. Every DbEntity must have its `IEntityTypeConfiguration<T>` class.

### Mandatory .NET structure

```
src/Infrastructure/Persistence/
├── Entities/
│   ├── DemandeDbEntity.cs
│   ├── UserDbEntity.cs
│   └── AddressDbEntity.cs
├── Configurations/               ← MANDATORY for each Entity
│   ├── DemandeConfiguration.cs
│   ├── UserConfiguration.cs
│   └── AddressConfiguration.cs
└── DbContext.cs
```

### Example: DemandeConfiguration

```csharp
// Infrastructure/Persistence/Configurations/DemandeConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using MonOrg.Backend.Demande.Domain;

namespace MonOrg.Backend.Demande.Infrastructure;

/// <summary>
/// EF Core configuration for DemandeDbEntity.
/// Defines indices, constraints, conversions, and relationships.
/// Critical for performance and data integrity.
/// </summary>
public class DemandeConfiguration : IEntityTypeConfiguration<DemandeDbEntity>
{
    public void Configure(EntityTypeBuilder<DemandeDbEntity> builder)
    {
        #region Indices (Performance)
        
        // Filter by status (frequent queries)
        builder.HasIndex(p => p.Status);
        
        // Sort by creation date (history)
        builder.HasIndex(p => p.CreatedDate);
        
        // Filter by category
        builder.HasIndex(p => p.Category);
        
        // Address: FK + unique constraint (1:1 relationship)
        builder.HasIndex(x => x.AddressId).IsUnique();
        
        #endregion
        
        #region Column Constraints (Data Integrity)
        
        // String fields: max length + type
        builder.Property(x => x.Title)
            .HasMaxLength(LengthTextConfig.TitleTextString);
        
        builder.Property(x => x.What)
            .HasColumnType("text")  // Large text in DB
            .HasMaxLength(LengthTextConfig.BigTextString);
        
        // Enum → int conversion (enum stored in DB)
        builder.Property(p => p.Status)
            .HasConversion<int>();  // DemandeStatusDbEnum → int
        
        builder.Property(p => p.Category)
            .HasConversion<int>()
            .HasDefaultValue(DemandeCategoryDbEnum.None);  // Default in DB
        
        // Custom collation for text sorting
        builder.Property(x => x.Title)
            .UseCollation(DemandeDbContext.CollationName);
        
        #endregion
        
        #region Relationships (Foreign Keys + Delete Behavior)
        
        // Source (Many-to-One, optional FK)
        builder.HasOne(x => x.Source)
            .WithMany(s => s.Demandes)
            .HasForeignKey(x => x.SourceId);
        
        // Zone (Many-to-One, required FK)
        builder.HasOne(x => x.Zone)
            .WithMany(s => s.Demandes)
            .HasForeignKey(x => x.ZoneId);
        
        // Requester (Many-to-One, optional FK)
        builder.HasOne(x => x.Requester)
            .WithMany(s => s.Demandes)
            .HasForeignKey(x => x.RequesterId);
        
        // Address (One-to-One, required, cascade delete)
        builder.HasOne(s => s.Address)
            .WithOne(a => a.Demande)
            .HasForeignKey<DemandeDbEntity>(x => x.AddressId)
            .IsRequired()
            .OnDelete(DeleteBehavior.Cascade);  // If demande is deleted → address is deleted
        
        // AssignedUser (Many-to-One, optional)
        builder.HasOne(x => x.AssignedUser)
            .WithMany(u => u.AssignedDemandes)
            .HasForeignKey(x => x.AssignedUserId);
        
        // CreatedUser (Many-to-One, required)
        builder.HasOne(x => x.CreatedUser)
            .WithMany(u => u.CreatedDemandes)
            .HasForeignKey(x => x.CreatedBy);
        
        // SupervisorUser (Many-to-One, optional)
        builder.HasOne(x => x.SupervisorUsers)
            .WithMany(u => u.SupervisedDemandes)
            .HasForeignKey(x => x.SupervisedUserId);
        
        // Ignore computed properties (not mapped in DB)
        builder.Ignore(x => x.AllDemandeLinks);
        
        #endregion
    }
}

// In DbContext.cs:
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    base.OnModelCreating(modelBuilder);
    
    // Apply ALL configurations
    modelBuilder.ApplyConfiguration(new DemandeConfiguration());
    modelBuilder.ApplyConfiguration(new AddressConfiguration());
    modelBuilder.ApplyConfiguration(new UserConfiguration());
    // ... etc
}
```

### Configuration directives

| Element | Pattern | Example | Reason |
|---------|---------|---------|--------|
| **Index** | Often filtered/sorted columns | `HasIndex(p => p.Status)` | SELECT performance |
| **Max Length** | Bounded string fields | `HasMaxLength(255)` | Integrity + performance |
| **Enum** | `<int>` conversion | `HasConversion<int>()` | DB serialization |
| **Default Value** | Default value in DB | `HasDefaultValue(None)` | INSERT consistency |
| **Collation** | Text sorting (accent, case) | `UseCollation("...")` | Consistent search/sort |
| **One-to-One** | `.WithOne()` + unique FK | `HasForeignKey<T>(...)` + `HasIndex().IsUnique()` | Enforces integrity |
| **Cascade Delete** | Cascading deletion | `OnDelete(DeleteBehavior.Cascade)` | Referential consistency |
| **Ignore** | Unmapped properties | `Ignore(x => x.Computed)` | Avoids mapping error |

### When to create a Configuration

- ✅ **Always**: every DbEntity in Production
- ✅ **Indices**: filtered columns (Status, Category, CreatedDate, ForeignKeys)
- ✅ **Constraints**: lengths (Title, What), conversions (Enum), defaults
- ✅ **Relationships**: HasOne/WithMany, cascade delete, unique constraints
- ❌ **Never**: let EF Core auto-configure (by default, it misses indices and defaults)

### Configuration deliverable checklist

- [ ] Configuration class `IEntityTypeConfiguration<T>` created
- [ ] Indices on all **Status/Category/CreatedDate** (frequent filtering)
- [ ] Indices on all **Foreign Keys** (joins)
- [ ] Max Length on all **string fields**
- [ ] Enum conversion `<int>` + default value where relevant
- [ ] Custom collation if **text search**
- [ ] Cascade Delete on **required one-to-one** (Address, Summary)
- [ ] Computed properties **ignored** (`Ignore()`)
- [ ] AppliedConfiguration called in **OnModelCreating**
- [ ] Migration generated (`dotnet ef migrations add ...`) and **verified** (SQL + indices in place)

## Validators — RequestDTO validation

Validation lives **at the edge of the HTTP request**, never in services. Two approaches: FluentValidation (.NET) or inline Validator (Laravel).

### .NET — FluentValidation

#### Dedicated validator

```csharp
// Application/DTOs/Requests/CreateDemandeRequestDtoValidator.cs
using FluentValidation;

namespace MonOrg.Backend.Demande.Application;

public class CreateDemandeRequestDtoValidator : AbstractValidator<CreateDemandeRequestDto>
{
    private readonly IUserRepository _userRepository;
    private readonly IZoneRepository _zoneRepository;

    public CreateDemandeRequestDtoValidator(
        IUserRepository userRepository,
        IZoneRepository zoneRepository)
    {
        _userRepository = userRepository;
        _zoneRepository = zoneRepository;

        #region Basic Validations

        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required")
            .MaximumLength(255).WithMessage("Title cannot exceed 255 characters");

        RuleFor(x => x.What)
            .NotEmpty().WithMessage("Description is required")
            .MaximumLength(5000).WithMessage("Description cannot exceed 5000 characters");

        RuleFor(x => x.Status)
            .NotEmpty()
            .IsEnumName(typeof(DemandeStatusDbEnum))
            .WithMessage("Invalid status");

        RuleFor(x => x.Importance)
            .NotNull().WithMessage("Importance must be specified");

        RuleFor(x => x.IsUrgent)
            .NotNull().WithMessage("Urgent flag must be specified");

        RuleFor(x => x.WhenFromDate)
            .NotEmpty()
            .GreaterThanOrEqualTo(DateTime.UtcNow.Date)
            .WithMessage("From date cannot be in the past");

        RuleFor(x => x.WhenToDate)
            .GreaterThan(x => x.WhenFromDate)
            .When(x => x.WhenToDate.HasValue)
            .WithMessage("To date must be after from date");

        RuleFor(x => x.Category)
            .NotEmpty()
            .IsEnumName(typeof(DemandeCategoryDbEnum))
            .WithMessage("Invalid category");

        #endregion

        #region Foreign Key Validations (Async)

        RuleFor(x => x.SourceId)
            .NotEmpty()
            .MustAsync(async (sourceId, ct) => await _zoneRepository.Exists(sourceId))
            .WithMessage("Source does not exist");

        RuleFor(x => x.ZoneId)
            .NotEmpty()
            .MustAsync(async (zoneId, ct) => await _zoneRepository.Exists(zoneId))
            .WithMessage("Zone does not exist");

        RuleFor(x => x.RequesterId)
            .MustAsync(async (requesterId, ct) => 
                requesterId == Guid.Empty || await _userRepository.Exists(requesterId))
            .WithMessage("Requester does not exist");

        RuleFor(x => x.AddressId)
            .NotEmpty()
            .WithMessage("Address is required");

        #endregion

        #region Custom Validations

        RuleFor(x => x)
            .CustomAsync(async (dto, context, ct) =>
            {
                // Business logic: if urgent, must have a supervisor assignment
                if (dto.IsUrgent && string.IsNullOrEmpty(dto.SourceId))
                {
                    context.AddFailure("For urgent demandes, source must be specified");
                }
            });

        #endregion
    }
}

// Register in DI (Startup.cs or Program.cs)
services.AddValidatorsFromAssemblyContaining<CreateDemandeRequestDtoValidator>();
```

#### Usage in the Controller

```csharp
// Controllers/DemandeController.cs
[HttpPost]
public async Task<IActionResult> Create([FromBody] CreateDemandeRequestDto dto)
{
    // ASP.NET Core [ApiController] validates automatically via FluentValidation
    // If validation fails → 400 Bad Request with detailed errors
    
    var result = await _demandeService.Create(dto);
    return result.Match(
        success => CreatedAtAction(nameof(GetById), new { id = success.Id }, success),
        failure => BadRequest(failure)
    );
}
```

### Laravel — Inline Validator

#### DTOs with static validation

```php
// app/DTOs/Requests/CreateDemandeRequestDto.php
namespace App\DTOs\Requests;

use Carbon\Carbon;
use Illuminate\Http\Request;

readonly class CreateDemandeRequestDto
{
    public function __construct(
        public string $title,
        public string $what,
        public string $status,
        public bool $importance,
        public bool $isUrgent,
        public Carbon $whenFromDate,
        public ?Carbon $whenToDate,
        public string $sourceId,
        public string $zoneId,
        public string $requesterId,
        public string $addressId,
        public string $category,
    ) {}

    /**
     * Define validation rules (static for reusability)
     */
    public static function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'what' => 'required|string|max:5000',
            'status' => 'required|string|in:pending,assigned,completed',
            'importance' => 'required|boolean',
            'isUrgent' => 'required|boolean',
            'whenFromDate' => 'required|date_format:Y-m-d H:i:s|after_or_equal:today',
            'whenToDate' => 'nullable|date_format:Y-m-d H:i:s|after:whenFromDate',
            'sourceId' => 'required|uuid|exists:sources,id',
            'zoneId' => 'required|uuid|exists:zones,id',
            'requesterId' => 'nullable|uuid|exists:requesters,id',
            'addressId' => 'required|uuid|exists:addresses,id',
            'category' => 'required|string|in:none,urgent,standard',
        ];
    }

    /**
     * Custom validation messages
     */
    public static function messages(): array
    {
        return [
            'title.required' => 'Title is required',
            'title.max' => 'Title cannot exceed 255 characters',
            'whenFromDate.after_or_equal' => 'From date cannot be in the past',
            'whenToDate.after' => 'To date must be after from date',
            'sourceId.exists' => 'Source does not exist',
            'zoneId.exists' => 'Zone does not exist',
        ];
    }

    /**
     * Validate and create from HTTP request
     */
    public static function fromRequest(Request $request): self
    {
        $validated = $request->validate(
            rules: self::rules(),
            messages: self::messages(),
        );

        // Custom validation: urgent requires source
        if ($validated['isUrgent'] && empty($validated['sourceId'])) {
            throw ValidationException::withMessages([
                'sourceId' => 'For urgent demandes, source is required',
            ]);
        }

        return new self(
            title: $validated['title'],
            what: $validated['what'],
            status: $validated['status'],
            importance: $validated['importance'],
            isUrgent: $validated['isUrgent'],
            whenFromDate: Carbon::parse($validated['whenFromDate']),
            whenToDate: isset($validated['whenToDate']) ? Carbon::parse($validated['whenToDate']) : null,
            sourceId: $validated['sourceId'],
            zoneId: $validated['zoneId'],
            requesterId: $validated['requesterId'],
            addressId: $validated['addressId'],
            category: $validated['category'],
        );
    }
}

// app/Http/Requests/StoreDemandeRequest.php (alternative: FormRequest)
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDemandeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return CreateDemandeRequestDto::rules();
    }

    public function messages(): array
    {
        return CreateDemandeRequestDto::messages();
    }
}
```

#### Usage in the Controller

```php
// app/Http/Controllers/DemandeController.php
public function store(Request $request): JsonResponse
{
    // Approach 1: inline DTO.fromRequest()
    $dto = CreateDemandeRequestDto::fromRequest($request);

    // Approach 2: validated FormRequest
    // $request = app(StoreDemandeRequest::class);
    // $dto = CreateDemandeRequestDto::fromRequest($request);

    $demande = $this->demandeService->create($dto);
    return response()->json(DemandeResource::make($demande), 201);
}
```

### Validator directives

| Element | Pattern | Reason |
|---------|---------|--------|
| **Basic validation** | MaxLength, NotEmpty, Pattern | Integrity at the edge |
| **FK validation** | exists:table,column | Referential integrity |
| **Async validation** | MustAsync (FV) or custom Rules | Cross-table checks |
| **Custom validation** | Custom() / CustomAsync() (FV) or ValidationException (Laravel) | Business logic |
| **Messages** | Localized in a mapping | Consistent UX |
| **Reusability** | Static rules/messages class | DRY |
| **Placement** | DTO.fromRequest() or FormRequest | Single source |

## Projections — optimized Entity/Model → DTO queries

Projections convert **at the database level** (SELECT with LINQ Expression or Eloquent) to avoid loading full entities into memory.

### .NET — LINQ Expression Projection

#### Mapper with projection

```csharp
// Application/Mappers/DemandeMapper.cs
using System.Linq.Expressions;

namespace MonOrg.Backend.Demande.Application;

public static class DemandeMapper
{
    /// <summary>
    /// LINQ projection: converts DbEntity → ResponseDto at the SQL level
    /// Does NOT execute in memory — the DB already returns the DTO
    /// </summary>
    public static readonly Expression<Func<DemandeDbEntity, DemandeResponseDto>> ToDtoProjection =
        s => new DemandeResponseDto(
            Id: s.Id,
            Title: s.Title,
            What: s.What,
            Status: s.Status.ToString(),
            Importance: s.Importance,
            IsUrgent: s.IsUrgent,
            WhenFromDate: s.WhenFromDate,
            WhenToDate: s.WhenToDate,
            CreatedDate: s.CreatedDate,
            UpdatedDate: s.UpdatedDate,
            SourceId: s.SourceId,
            ZoneId: s.ZoneId,
            RequesterId: s.RequesterId,
            AddressId: s.AddressId,
            Category: s.Category.ToString(),
            CreatedBy: s.CreatedBy,
            UpdatedBy: s.UpdatedBy,
            DueDate: s.DueDate,
            AssignedDate: s.AssignedDate,
            AssignedUserId: s.AssignedUserId,
            SupervisedDate: s.SupervisedDate,
            SupervisedUserId: s.SupervisedUserId,
            Code: s.Code
            // NEVER include raw navigations:
            // Source = s.Source,  ← BUG: exposes the entire hierarchy
            // Address = s.Address,
        );

    /// <summary>
    /// Projection for lists (minimal fields)
    /// </summary>
    public static readonly Expression<Func<DemandeDbEntity, DemandeListItemDto>> ToListItemProjection =
        s => new DemandeListItemDto(
            Id: s.Id,
            Title: s.Title,
            Status: s.Status.ToString(),
            CreatedDate: s.CreatedDate,
            Code: s.Code
        );

    /// <summary>
    /// Compile and execute
    /// </summary>
    public static DemandeResponseDto ToDto(DemandeDbEntity entity)
        => ToDtoProjection.Compile()(entity);

    /// <summary>
    /// Map a DbEntity after loading into memory (rare)
    /// </summary>
    public static DemandeResponseDto ToDto(DemandeDbEntity entity, Func<DemandeDbEntity, DemandeResponseDto> transformer)
        => transformer(entity);
}
```

#### Usage in the Repository

```csharp
// Infrastructure/Repositories/DemandeRepository.cs
public Task<Result<List<DemandeResponseDto>>> GetByDemandesByZone(Guid zoneId)
{
    // Projection at SQL level — the DB already returns the DTOs
    return DbSet
        .Where(s => s.ZoneId == zoneId && s.Status != DemandeStatusDbEnum.Done)
        .Select(DemandeMapper.ToDtoProjection)  // ← LINQ projection
        .ToListAsync();
}

public Task<Result<DemandeResponseDto>> GetByIdAsDto(Guid id)
{
    return DbSet
        .Where(s => s.Id == id)
        .Select(DemandeMapper.ToDtoProjection)  // ← LINQ projection
        .FirstOrDefaultAsync();
}
```

### Laravel — Eloquent Projection (Alternative: Query Builder)

#### Mapper with a minimized select

```php
// app/Mappers/DemandeMapper.php
namespace App\Mappers;

use App\DTOs\Responses\DemandeResponseDto;
use App\Models\Demande;
use Illuminate\Database\Eloquent\Collection;

class DemandeMapper
{
    /**
     * Transform Model → ResponseDto
     */
    public static function toDto(Demande $model): DemandeResponseDto
    {
        return new DemandeResponseDto(
            id: $model->id,
            title: $model->title,
            what: $model->what,
            status: $model->status,
            importance: $model->importance,
            isUrgent: $model->is_urgent,
            whenFromDate: $model->when_from_date,
            whenToDate: $model->when_to_date,
            createdDate: $model->created_at,
            updatedDate: $model->updated_at,
            sourceId: $model->source_id,
            zoneId: $model->zone_id,
            requesterId: $model->requester_id,
            addressId: $model->address_id,
            category: $model->category,
            createdBy: $model->created_by,
            updatedBy: $model->updated_by,
            dueDate: $model->due_date,
            assignedDate: $model->assigned_date,
            assignedUserId: $model->assigned_user_id,
            supervisedDate: $model->supervised_date,
            supervisedUserId: $model->supervised_user_id,
            code: $model->code
        );
    }

    /**
     * Transform Collection of Models → DTOs
     */
    public static function toDtos(Collection $models): array
    {
        return $models->map(fn(Demande $m) => self::toDto($m))->all();
    }
}
```

#### Usage in the Repository (optimized Query Builder)

```php
// app/Repositories/DemandeRepository.php
public function getDemandesByZoneAsDto(string $zoneId): array
{
    // Query Builder: select ONLY the needed columns (projection at SQL level)
    $demandes = Demande::where('zone_id', $zoneId)
        ->where('status', '!=', 'done')
        ->select([  // ← Projection: explicit columns
            'id', 'title', 'status', 'created_date', 'code',
            'what', 'importance', 'is_urgent', 'when_from_date', 'when_to_date',
            'source_id', 'zone_id', 'requester_id', 'address_id', 'category',
            'created_at', 'updated_at', 'created_by', 'updated_by',
            'due_date', 'assigned_date', 'assigned_user_id', 'supervised_date', 'supervised_user_id'
        ])
        ->get();

    return DemandeMapper::toDtos($demandes);
}

public function getDemandeByIdAsDto(string $id): ?DemandeResponseDto
{
    $demande = Demande::where('id', $id)
        ->select([  // ← Projection
            'id', 'title', 'what', 'status', 'importance', 'is_urgent',
            'when_from_date', 'when_to_date', 'source_id', 'zone_id',
            'requester_id', 'address_id', 'category', 'created_at', 'updated_at',
            'created_by', 'updated_by', 'due_date', 'assigned_date', 'assigned_user_id',
            'supervised_date', 'supervised_user_id', 'code'
        ])
        ->first();

    return $demande ? DemandeMapper::toDto($demande) : null;
}
```

### Projection directives

| Element | Pattern | Reason |
|---------|---------|--------|
| **SQL Projection** | `Select(Mapper.ToDtoProjection)` (.NET) or `.select([...])` (Laravel) | Perf: no full entity loading |
| **No navigations** | Never include FK relations in a projection | Avoids N+1, doesn't expose children |
| **Minimal columns** | Select ONLY what goes to the DTO | Less memory + network data |
| **Enums** | `.ToString()` in projection (.NET) or raw enum value (Laravel) | Consistent serialization |
| **Dates** | Parsed in the DTO's readonly constructor | Strong typing |
| **Computed fields** | Never in a projection — compute in the mapper if needed | No extra DB load |

## Mappers — Entity/Model → DTO conversion

Mappers **convert at the appropriate level**: SQL projections (repositories), or in memory (services).

### .NET — Static Mapper

```csharp
// Application/Mappers/DemandeMapper.cs
public static class DemandeMapper
{
    // LINQ projection (SQL-level) already shown above

    /// <summary>Mapper after in-memory loading (with navigations)</summary>
    public static DemandeDetailDto ToDetailDto(DemandeDbEntity entity)
    {
        return new DemandeDetailDto(
            Id: entity.Id,
            Title: entity.Title,
            Missions: entity.Missions.Select(m => new MissionDto(m.Id, m.Name)).ToList(),
            Address: new AddressDto(entity.Address.Id, entity.Address.Street, entity.Address.City),
            AssignedUser: entity.AssignedUser != null 
                ? new UserDto(entity.AssignedUser.Id, entity.AssignedUser.Email)
                : null
        );
    }

    /// <summary>Mapper from DTO → DbEntity (rare, before Create)</summary>
    public static DemandeDbEntity FromRequestDto(CreateDemandeRequestDto dto)
    {
        return new DemandeDbEntity
        {
            Id = Guid.NewGuid(),
            Title = dto.Title,
            What = dto.What,
            Status = Enum.Parse<DemandeStatusDbEnum>(dto.Status),
            Importance = dto.Importance,
            IsUrgent = dto.IsUrgent,
            WhenFromDate = dto.WhenFromDate,
            WhenToDate = dto.WhenToDate,
            SourceId = Guid.Parse(dto.SourceId),
            ZoneId = Guid.Parse(dto.ZoneId),
            RequesterId = Guid.Parse(dto.RequesterId),
            AddressId = Guid.Parse(dto.AddressId),
            Category = Enum.Parse<DemandeCategoryDbEnum>(dto.Category),
            CreatedDate = DateTime.UtcNow,
        };
    }
}
```

### Laravel — Mapper Class

```php
// app/Mappers/DemandeMapper.php
class DemandeMapper
{
    /// Mapper after loading (with relations)
    public static function toDetailDto(Demande $model): DemandeDetailDto
    {
        return new DemandeDetailDto(
            id: $model->id,
            title: $model->title,
            missions: $model->missions->map(fn($m) => new MissionDto($m->id, $m->name))->all(),
            address: new AddressDto($model->address->id, $model->address->street, $model->address->city),
            assignedUser: $model->assignedUser 
                ? new UserDto($model->assignedUser->id, $model->assignedUser->email)
                : null
        );
    }

    /// Mapper RequestDto → Model
    public static function fromRequestDto(CreateDemandeRequestDto $dto): array
    {
        return [
            'title' => $dto->title,
            'what' => $dto->what,
            'status' => $dto->status,
            'importance' => $dto->importance,
            'is_urgent' => $dto->isUrgent,
            'when_from_date' => $dto->whenFromDate,
            'when_to_date' => $dto->whenToDate,
            'source_id' => $dto->sourceId,
            'zone_id' => $dto->zoneId,
            'requester_id' => $dto->requesterId,
            'address_id' => $dto->addressId,
            'category' => $dto->category,
        ];
    }
}
```

### Mapper directives

| Element | Pattern | Reason |
|---------|---------|--------|
| **Static** | Class with static methods | No instantiation, reusable |
| **Projections** | Before loading (SQL-level) | Performance |
| **In memory** | After loading (navigations available) | Flexibility |
| **Bidirectional** | Entity ↔ DTO, RequestDto → Entity | Clear separation |
| **Enums** | string ↔ enum conversion | Consistency |
| **Null-safety** | Check nullability before converting | No crash |

## Repositories — Persistence abstraction (Backend only)

**Core rule**: repositories **abstract data access** (DbContext/DB facade). Services call the repository, never the DbContext/DB directly. The repository returns `DbEntity`s or business aggregates — never DTOs (DTOs are converted at the controller/service level).

### .NET Pattern

#### Repository Interface — Full hierarchy

```csharp
// Shared/Application/IBaseServiceRepository.cs
using Core;
using System.Linq.Expressions;

namespace MonOrg.Backend.Shared.Application;

/// <summary>
/// Base repository interface — CRUD operations for all entities
/// To implement in PostGresRepository<TContext, TEntity> or a base class
/// </summary>
public interface IBaseServiceRepository<TEntity> where TEntity : class
{
    /// <summary>Get by primary key (Guid Id)</summary>
    Task<Result<TEntity>> GetById(Guid id);
    
    /// <summary>Get all entities or filtered by predicate</summary>
    Task<Result<List<TEntity>>> Get(Expression<Func<TEntity, bool>>? predicate = null);
    
    /// <summary>Get single entity with optional eager loads (includes)</summary>
    Task<Result<TEntity>> Find(
        Expression<Func<TEntity, bool>> predicate,
        Func<IQueryable<TEntity>, IQueryable<TEntity>>? includes = null);
    
    /// <summary>Get and project to custom type (DTO or aggregation)</summary>
    Task<Result<List<TEntityDto>>> GetAndProject<TEntityDto>(
        Expression<Func<TEntity, TEntityDto>> projection,
        Expression<Func<TEntity, bool>>? predicate = null);
    
    /// <summary>Get count matching predicate</summary>
    Task<Result<int>> GetCount(Expression<Func<TEntity, bool>>? predicate = null);
    
    /// <summary>Check if exists</summary>
    Task<Result> Exists(Expression<Func<TEntity, bool>> predicate);
    
    /// <summary>Create single entity</summary>
    Task<Result<TEntity>> Create(TEntity entity);
    
    /// <summary>Create multiple entities</summary>
    Task<Result> CreateMany(IEnumerable<TEntity> entities);
    
    /// <summary>Update entire entity</summary>
    Task<Result> Update(TEntity entity);
    
    /// <summary>Update only specific properties via bulk update (ExecuteUpdateAsync)</summary>
    Task<Result> UpdatePartial(TEntity entity, Expression<Func<TEntity, object>> properties);
    
    /// <summary>Delete by ID</summary>
    Task<Result> Delete(Guid id);
    
    /// <summary>Delete multiple by predicate</summary>
    Task<Result> DeleteMany(Expression<Func<TEntity, bool>> predicate);
}

// Application/Repositories/IDemandeRepository.cs
namespace MonOrg.Backend.Demande.Application;

/// <summary>
/// Demande-specific repository interface — business domain queries
/// Inherits from IBaseServiceRepository<T> for CRUD
/// </summary>
public interface IDemandeRepository : IBaseServiceRepository<DemandeDbEntity>
{
    /// <summary>Update only category field (partial, bulk)</summary>
    Task<Result> SetDemandeCategory(DemandeDbEntity demande);
    
    /// <summary>Count demandes by status for a specific user/zone</summary>
    Task<Result<Dictionary<DemandeStatusDbEnum, int>>> CountDemandesStatusByUser(Guid userId, Guid zoneId);
    
    /// <summary>Count demandes awaiting validation</summary>
    Task<Result<int>> CountToValidateDemandesByZone(Guid userId, Guid zoneId);
    
    /// <summary>Acquire demande (atomic transaction)</summary>
    Task<Result> AcquireDemande(Guid demandeId, Guid operatorId);
    
    /// <summary>Load demande with eager-loaded missions</summary>
    Task<Result<DemandeDbEntity>> FindDemandeWithMissions(Guid demandeId);
    
    /// <summary>Load demande with all IA-related details (complex graph)</summary>
    Task<Result<DemandeDbEntity>> FindDemandeWithIaDetails(Guid demandeId);
    
    /// <summary>Take supervision (atomic transaction)</summary>
    Task<Result> TakeSupervision(Guid demandeId, Guid supervisorId);
    
    /// <summary>Get linked demandes with custom projection to DTO</summary>
    Task<Result<List<TEntityDto>>> GetLinkedDemandesByDemandeId<TEntityDto>(
        Guid demandeId,
        Expression<Func<DemandeDbEntity, TEntityDto>> projection);
    
    /// <summary>Get multiple demandes by IDs</summary>
    Task<Result<List<DemandeDbEntity>>> GetDemandesByIds(List<Guid> demandesIds);
}
```

#### Repository Implementation

```csharp
// Infrastructure/Repositories/DemandeRepository.cs
using Core;
using Core.App;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace MonOrg.Backend.Demande.Infrastructure;

/// <summary>
/// Demande repository — abstracts all data access for the Demande aggregate
/// [Injectable] enables auto-registration in the DI container
/// </summary>
[Injectable]
public class DemandeRepository(DemandeDbContext context) 
    : PostGresRepository<DemandeDbContext, DemandeDbEntity>(context), 
    IBaseServiceRepository<DemandeDbEntity>, 
    IDemandeRepository
{
    /// <summary>Update only category field (partial update)</summary>
    public Task<Result> SetDemandeCategory(DemandeDbEntity demande)
        => UpdatePartial(demande, s => s.Category);

    /// <summary>Count by status for a specific user/zone</summary>
    public Task<Result<Dictionary<DemandeStatusDbEnum, int>>> CountDemandesStatusByUser(Guid userId, Guid zoneId) 
        => Result<Dictionary<DemandeStatusDbEnum, int>>.SafeExecute(async () =>
        {
            // Group by status (excluding New and Done)
            var countByStatus = await DbSet
                .Where(s => s.ZoneId == zoneId 
                    && s.AssignedUserId == userId 
                    && s.Status != DemandeStatusDbEnum.New 
                    && s.Status != DemandeStatusDbEnum.Done)
                .GroupBy(s => s.Status)
                .Select(g => new { Status = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Status, x => x.Count);

            // Add count for New status (if unassigned OR assigned to this user)
            var countNewStatus = await DbSet.CountAsync(s => 
                s.ZoneId == zoneId 
                && s.Status == DemandeStatusDbEnum.New 
                && (s.AssignedUserId == null || s.AssignedUserId == userId));
            
            countByStatus.Add(DemandeStatusDbEnum.New, countNewStatus);
            return countByStatus;
        });

    /// <summary>Atomic transaction: assign demande to operator</summary>
    public Task<Result> AcquireDemande(Guid demandeId, Guid operatorId) 
        => Result.SafeExecute(async () =>
        {
            await using var transaction = await Context.Database.BeginTransactionAsync();
            
            var now = DateTime.UtcNow;
            
            // Bulk update: only update if unassigned AND status is New
            var updated = await DbSet
                .Where(s => s.Id == demandeId 
                    && s.AssignedUserId == null 
                    && s.Status == DemandeStatusDbEnum.New)
                .ExecuteUpdateAsync(setter => setter
                    .SetProperty(p => p.AssignedUserId, operatorId)
                    .SetProperty(p => p.AssignedDate, now)
                    .SetProperty(p => p.UpdatedDate, now)
                    .SetProperty(p => p.UpdatedBy, operatorId));

            if (updated == 1)
            {
                // Log the action in history
                Context.Set<DemandeHistoryDbEntity>().Add(new DemandeHistoryDbEntity
                {
                    DemandeId = demandeId,
                    Action = DemandeHistoryActionDbEnum.DemandeAssignedTo
                });
                await Context.SaveChangesAsync();
                await transaction.CommitAsync();
                return Result.Success;
            }

            // Check if already acquired by this operator
            var alreadyAcquired = await Exists(s => s.Id == demandeId && s.AssignedUserId == operatorId);
            if (alreadyAcquired.IsAlready)
                return Result.Success;  // Idempotent: already assigned to this operator

            // Acquired by someone else
            return Result.Already.WithReason("The demande is already acquired by another operator");
        });

    /// <summary>Load with missions (eager load via Include)</summary>
    public Task<Result<DemandeDbEntity>> FindDemandeWithMissions(Guid demandeId)
        => Find(s => s.Id == demandeId, 
            q => q.Include(s => s.Missions));

    /// <summary>Atomic transaction: take supervision</summary>
    public Task<Result> TakeSupervision(Guid demandeId, Guid supervisorId) 
        => Result.SafeExecute(async () =>
        {
            await using var transaction = await Context.Database.BeginTransactionAsync();
            
            var updated = await DbSet
                .Where(s => s.Status == DemandeStatusDbEnum.ToValidate 
                    && s.Id == demandeId 
                    && s.SupervisedUserId == null)
                .ExecuteUpdateAsync(setter => setter
                    .SetProperty(p => p.SupervisedUserId, supervisorId)
                    .SetProperty(p => p.SupervisedDate, DateTime.UtcNow)
                    .SetProperty(p => p.UpdatedDate, DateTime.UtcNow)
                    .SetProperty(p => p.UpdatedBy, supervisorId));

            if (updated == 1)
            {
                Context.Set<DemandeHistoryDbEntity>().Add(new DemandeHistoryDbEntity
                {
                    DemandeId = demandeId,
                    Action = DemandeHistoryActionDbEnum.DemandeSupervisedBy
                });
                await Context.SaveChangesAsync();
                await transaction.CommitAsync();
                return Result.Success;
            }

            var alreadySupervised = await Exists(s => s.Id == demandeId && s.SupervisedUserId == supervisorId);
            if (alreadySupervised.IsAlready)
                return Result.Success;

            return Result.Already.WithReason("The demande is already supervised by another operator");
        });

    /// <summary>Full load with all IA-related data (complex eager load)</summary>
    public Task<Result<DemandeDbEntity>> FindDemandeWithIaDetails(Guid demandeId)
        => Find(s => s.Id == demandeId,
            q => q
                .Include(s => s.Missions).ThenInclude(m => m.Tasks).ThenInclude(t => t.AssignedUser)
                .Include(s => s.Missions).ThenInclude(m => m.OperationalService)
                .Include(s => s.Responses)
                .Include(s => s.Address)
                .Include(s => s.Source)
                .Include(s => s.Requester).ThenInclude(r => r!.Address)
                .Include(s => s.Summary)
                .Include(s => s.AssignedUser));

    /// <summary>Get linked demandes with custom projection to DTO</summary>
    public Task<Result<List<TEntityDto>>> GetLinkedDemandesByDemandeId<TEntityDto>(
        Guid demandeId,
        Expression<Func<DemandeDbEntity, TEntityDto>> projection)
        => GetAndProject(projection, s =>
                s.LeftDemandeLinks.Any(l => l.RightDemandeId == demandeId) 
                || s.RightDemandeLinks.Any(l => l.LeftDemandeId == demandeId));

    /// <summary>Get multiple by IDs</summary>
    public Task<Result<List<DemandeDbEntity>>> GetDemandesByIds(List<Guid> demandesIds)
        => Get(s => demandesIds.Contains(s.Id));
}
```

### Laravel Pattern

#### Repository Interface

```php
// app/Repositories/Contracts/IDemandeRepository.php
namespace App\Repositories\Contracts;

use App\Models\Demande;
use Illuminate\Database\Eloquent\Collection;

interface IDemandeRepository
{
    /// Get by ID with optional eager loads
    public function findWithMissions(string $demandeId): ?Demande;
    
    /// Count by status for a user in a zone
    public function countDemandesByUserAndZone(string $userId, string $zoneId): array;
    
    /// Count awaiting validation
    public function countToValidateInZone(string $userId, string $zoneId): int;
    
    /// Acquire demande (atomic)
    public function acquireDemande(string $demandeId, string $operatorId): bool;
    
    /// Take supervision (atomic)
    public function takeSupervisor(string $demandeId, string $supervisorId): bool;
    
    /// Load with all IA details
    public function findWithIaDetails(string $demandeId): ?Demande;
    
    /// Get linked demandes with custom transformation
    public function getLinkedByDemandeId(string $demandeId, callable $transform = null): Collection;
    
    /// Get multiple by IDs
    public function findByIds(array $demandeIds): Collection;
}
```

### Laravel — Repository Interface

#### Repository Interface — Full hierarchy

```php
// app/Repositories/Contracts/IRepository.php
namespace App\Repositories\Contracts;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;

/**
 * Base repository interface — CRUD operations for all models
 * @template TModel of Model
 */
interface IRepository
{
    /**
     * Get by primary key
     */
    public function findById(string $id): ?Model;
    
    /**
     * Get all or filtered
     */
    public function get(array $where = []): Collection;
    
    /**
     * Get single with optional eager loads
     */
    public function find(array $where = [], array $with = []): ?Model;
    
    /**
     * Get count
     */
    public function count(array $where = []): int;
    
    /**
     * Check if exists
     */
    public function exists(array $where = []): bool;
    
    /**
     * Create
     */
    public function create(array $data): Model;
    
    /**
     * Create multiple
     */
    public function createMany(array $data): Collection;
    
    /**
     * Update
     */
    public function update(string $id, array $data): bool;
    
    /**
     * Update multiple by criteria
     */
    public function updateMany(array $where, array $data): int;
    
    /**
     * Delete
     */
    public function delete(string $id): bool;
    
    /**
     * Delete multiple by criteria
     */
    public function deleteMany(array $where): int;
}

// app/Repositories/Contracts/IDemandeRepository.php
namespace App\Repositories\Contracts;

use App\DTOs\Responses\DemandeResponseDto;
use App\Models\Demande;
use Illuminate\Database\Eloquent\Collection;
```

## 🔧 Services — Business logic & orchestration

Services orchestrate the whole flow: **validated RequestDto → Repository → Transformations → ResponseDto**. Never business logic in the controller or the repository. The service decides, the repository executes.

### Hierarchy — Interfaces + Implementation

**Each domain has**:
- An `IServiceBase<TEntity>` (generic CRUD + transactions)
- An `I<Entity>Service` (specialized business logic)
- An `<Entity>Service` (.NET `[Injectable]` / Laravel constructor DI) implementing both

### .NET — Service with transactions & orchestration

```csharp
// Application/Interfaces/IDemandeService.cs
namespace MonOrg.Backend.Demande.Application;

using MonOrg.Backend.Autogenerated.Dtos;

public interface IDemandeService
{
    /// <summary>Create demande — orchestrates validation, repository, queue</summary>
    Task<Result<DemandeReadDto>> CreateDemande(DemandeWriteDto dto);
    
    /// <summary>Get with full context (ia details, history, responses)</summary>
    Task<Result<DemandeReadDto>> GetDemande(Guid id);
    
    /// <summary>Search with filters & pagination</summary>
    Task<Result<DemandeListDto>> SearchDemandes(DataQueryDto query);
    
    /// <summary>Assign to operator (idempotent, atomic)</summary>
    Task<Result<DemandeReadDto>> AssignDemande(Guid id);
    
    /// <summary>Supervise (idempotent, atomic)</summary>
    Task<Result<DemandeReadDto>> SuperviseDemande(Guid id);
    
    /// <summary>Update with history tracking</summary>
    Task<Result<DemandeReadDto>> UpdateDemande(Guid id, DemandeWriteDto dto);
    
    /// <summary>Orchestrate IA generation, categorization, email dispatch</summary>
    Task<Result> SetGeneratedIAContent(Guid id, CancellationToken ct = default);
}

// Application/Services/DemandeService.cs
[Injectable]
public class DemandeService : IDemandeService
{
    // ──── Injections ────
    private readonly IUnitOfWork _unitOfWork;
    private readonly IEmailService _emailService;
    private readonly ICurrentUserService _currentUserService;
    private readonly ISophiaService _sophiaService;          // ← external
    private readonly IDemandeBusinessRuleService _br;  // ← domain rules
    private readonly ITemplateRenderService _templateRender;
    private readonly IPdfService _pdfService;
    
    public DemandeService(
        ILogger<DemandeService> logger,
        ICurrentRequestService currentRequest,
        IUnitOfWork unitOfWork,
        IEmailService emailService,
        ICurrentUserService currentUserService,
        ISophiaService sophiaService,
        IDemandeBusinessRuleService br,
        ITemplateRenderService templateRender,
        IPdfService pdfService)
        : base(logger, unitOfWork.DemandeRepository)
    {
        _unitOfWork = unitOfWork;
        _emailService = emailService;
        _currentUserService = currentUserService;
        _sophiaService = sophiaService;
        _br = br;
        _templateRender = templateRender;
        _pdfService = pdfService;
    }
    
    // ──── Orchestration patterns ────
    
    /// <summary>
    /// CREATE — Validate → Map → Persist → Enqueue → Return
    /// </summary>
    public Task<Result<DemandeReadDto>> CreateDemande(DemandeWriteDto dto) =>
        Result<DemandeReadDto>.SafeExecute(async () =>
        {
            // 1. Validation (via FluentValidation in the controller)
            var entity = DemandeMappers.MapToDbEntity(dto, _currentUserService.ZoneId);
            
            // 2. Persist
            var created = await _unitOfWork.DemandeRepository.Create(entity).ThrowIfNotSuccess();
            
            // 3. Enqueue (for async processing: IA, email)
            await _demandeCreatedQueue.EnqueueAsync(created.Id);
            
            // 4. Return DTO (SQL-level projection)
            return await GetDemande(created.Id);
        });
    
    /// <summary>
    /// ASSIGN — Atomic locking with idempotence
    /// </summary>
    public Task<Result<DemandeReadDto>> AssignDemande(Guid id) =>
        Result<DemandeReadDto>.SafeExecute(async () =>
        {
            // Transaction: check state → acquire atomically → return
            var result = await _unitOfWork.DemandeRepository
                .AcquireDemande(id, _currentUserService.UserId)
                .ThrowIfNotSuccess();
            
            return await GetDemande(id);
        });
    
    /// <summary>
    /// UPDATE — Validate state → Apply → Trace → Enqueue optionally
    /// </summary>
    public Task<Result<DemandeReadDto>> UpdateDemande(Guid id, DemandeWriteDto dto) =>
        Result<DemandeReadDto>.SafeExecute(async () =>
        {
            // 1. Load and check state
            var entity = await _unitOfWork.DemandeRepository.FindById(id)
                .ThrowIfNotSuccess();
            _br.EnsureDemandeCanBeUpdated(entity).ThrowIfNotSuccess();
            
            // 2. Apply changes
            DemandeMappers.ApplyToDbEntity(dto, entity);
            
            // 3. Trace (history)
            await _unitOfWork.DemandeHistoryRepository
                .Add(new DemandeHistoryDbEntity { 
                    Action = DemandeHistoryActionDbEnum.Updated, 
                    DemandeId = id 
                });
            
            // 4. Persist
            await _unitOfWork.DemandeRepository.UpdateAndSave(entity)
                .ThrowIfNotSuccess();
            
            // 5. Enqueue if needed (e.g. urgent → AI priority)
            if (dto.IsUrgent)
                await _demandeCreatedQueue.EnqueueAsync(id);
            
            return await GetDemande(id);
        });
    
    /// <summary>
    /// ORCHESTRATE AI — Call Sophia service → Update persistence → Enqueue responses
    /// </summary>
    public Task<Result> SetGeneratedIAContent(Guid id, CancellationToken ct = default) =>
        Result.SafeExecute(async () =>
        {
            var entity = await _unitOfWork.DemandeRepository
                .FindDemandeWithIaDetails(id).ThrowIfNotSuccess();
            
            // Call Sophia (external)
            var iaResult = await _sophiaService.GenerateSummaryAsync(entity, ct)
                .ThrowIfNotSuccess();
            
            // Apply result to persistence
            entity.Summary.Content = iaResult.Content;
            entity.Summary.Status = DemandeGenerationStatusDbEnum.Done;
            
            await _unitOfWork.DemandeRepository.UpdateAndSave(entity)
                .ThrowIfNotSuccess();
            
            // Enqueue next step (if urgent → email)
            if (entity.IsUrgent)
                await _demandeIaQueue.EnqueueAsync(id);
            
            return Result.Success;
        });
}
```

**Key patterns**:
- **Result<T>** wrapper — success/error monad
- **SafeExecute** — catch-all try-catch, auto logging
- **UnitOfWork.ThrowIfNotSuccess()** — short-circuit on error
- **GetDemande()** helper — reused for consistent projections
- **Async enqueue** — avoids synchronous blocking

### Laravel — Service with transactions & orchestration

```php
// app/Services/Contracts/IDemandeService.php
namespace App\Services\Contracts;

use App\DTOs\Requests\DemandeWriteRequestDto;
use App\DTOs\Responses\DemandeResponseDto;

interface IDemandeService
{
    /**
     * Create demande — transactions, validation, enqueue
     */
    public function createDemande(DemandeWriteRequestDto $dto): DemandeResponseDto;
    
    /**
     * Get with all context (ia details, history, responses)
     */
    public function getDemande(string $id): DemandeResponseDto;
    
    /**
     * Search with filters & pagination
     */
    public function searchDemandes(array $filters = [], int $page = 1): DemandeListResponseDto;
    
    /**
     * Assign to operator (idempotent, atomic)
     */
    public function assignDemande(string $id, string $operatorId): DemandeResponseDto;
    
    /**
     * Supervise (idempotent, atomic)
     */
    public function superviseDemande(string $id, string $supervisorId): DemandeResponseDto;
    
    /**
     * Update with history tracking
     */
    public function updateDemande(string $id, DemandeWriteRequestDto $dto): DemandeResponseDto;
    
    /**
     * Orchestrate IA generation, categorization, email dispatch
     */
    public function generateIAContent(string $id): void;
}

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
        private SophiaService $sophia,
        private DemandeBusinessRuleService $br,
        private EmailService $emailService,
        private TemplateRenderService $templateRender,
        private PdfService $pdfService,
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
            
            // 2. Persist
            $this->demande->create($model->toArray());
            
            // 3. Enqueue (for AI, email, notifications)
            Queue::push(new DemandeCreatedJob($model->id));
            
            Log::info('Demande created', [
                'id' => $model->id,
                'zone_id' => auth()->user()?->zone_id,
            ]);
            
            // 4. Return DTO with projections
            return $this->getDemande($model->id);
        });
    }
    
    /**
     * ASSIGN — Locking with idempotence
     */
    public function assignDemande(string $id, string $operatorId): DemandeResponseDto
    {
        return $this->db->transaction(function () use ($id, $operatorId) {
            $demande = $this->demande->findWithLock($id);
            
            if ($demande->assigned_user_id === $operatorId) {
                return $this->getDemande($id); // Idempotent — already assigned
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
     * UPDATE — Validate state → Apply → Trace
     */
    public function updateDemande(string $id, DemandeWriteRequestDto $dto): DemandeResponseDto
    {
        return $this->db->transaction(function () use ($id, $dto) {
            $demande = $this->demande->findById($id);
            
            // Check state
            $this->br->canUpdate($demande);
            
            // Apply (mutation with casting)
            $data = $dto->toArray();
            $this->demande->update($id, $data);
            
            // Trace
            $demande->histories()->create([
                'action' => 'updated',
                'user_id' => auth()->id(),
                'data' => json_encode(array_keys($data)), // log what changed
            ]);
            
            // Enqueue if urgent
            if ($dto->isUrgent) {
                Queue::push(new DemandePriorityJob($id));
            }
            
            return $this->getDemande($id);
        });
    }
    
    /**
     * ORCHESTRATE IA — Call Sophia → Persist → Enqueue next
     */
    public function generateIAContent(string $id): void
    {
        $this->db->transaction(function () use ($id) {
            $demande = $this->demande->findWithIaDetails($id);
            
            // Call Sophia (external)
            $result = $this->sophia->generateSummary($demande);
            
            if (!$result->success) {
                Log::error('IA generation failed', ['id' => $id]);
                return;
            }
            
            // Persist
            $demande->summary->update([
                'content' => $result->content,
                'status' => 'done',
            ]);
            
            // Enqueue next
            if ($demande->is_urgent) {
                Queue::push(new SendUrgentEmailJob($id));
            } else {
                Queue::push(new CategorizeDemandeJob($id));
            }
            
            Log::info('IA content generated', ['id' => $id]);
        });
    }
    
    /**
     * Helper — Load + Project to DTO (reused everywhere)
     */
    private function getDemande(string $id): DemandeResponseDto
    {
        $model = $this->demande->findById($id);
        return DemandeMapper::toResponseDto($model);
    }
}
```

**Key patterns**:
- **DB::transaction()** — mandatory atomicity for multi-updates
- **Idempotence** — check state before acting (assignment doesn't loop)
- **History tracking** — every mutation recorded
- **Queue::push()** — async without waiting
- **Contextual logging** — user_id, zone_id, resource id

### Dependency Injection — Registration

**Laravel** (`config/app.php`/`RepositoryServiceProvider.php`):

```php
// app/Providers/RepositoryServiceProvider.php
public function register()
{
    // Repositories
    $this->app->bind(IDemandeRepository::class, DemandeRepository::class);
    
    // Services
    $this->app->bind(IDemandeService::class, DemandeService::class);
}

// config/app.php — register provider
'providers' => [
    // ...
    App\Providers\RepositoryServiceProvider::class,
],
```

**.NET** (`Microsoft.Extensions.DependencyInjection`):

```csharp
// Extension method — Program.cs
public static IServiceCollection AddDemandeServices(this IServiceCollection services)
{
    services.AddScoped<IDemandeService, DemandeService>();
    services.AddScoped<IDemandeRepository, DemandeRepository>();
    return services;
}

// Program.cs
builder.Services.AddDemandeServices();
```

### Where does business logic live?

| Logic | Lives in | Never in |
|---------|----------|-------------|
| Basic validations (required, max, enum) | **Validator** (FluentValidation/.NET or Validator::make Laravel) | ❌ Service |
| Complex business rules (state machine, dependencies) | **BusinessRuleService** (or aggregate root) | ❌ Controller |
| Entity ↔ DTO transformation | **Mapper** (static class / API Resource) | ❌ Service |
| Persistence access | **Repository** (interface) | ❌ Direct service (interface injection) |
| Orchestration (service calls + persistence) | **Service** (here) | ✅ Correct |
| Multi-step transactions | **Service** (UnitOfWork / DB::transaction) | ❌ Repository |
| Domain transformation | **Domain Model** / **Aggregate root** | ❌ DTO |

### Cross-stack summary — Services across the chain

```
┌────────────────────────────────────────────────────────────────────────────┐
│ FULL STACK — Services & DTOs                                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│ BACKEND — Business orchestration                                          │
│ ┌─────────────────────────────────────────────────────────────┐          │
│ │ Controller:         RequestDto → Service (validated)          │          │
│ │ Service:            Orchestration (Repository + validations)  │          │
│ │                     Returns Result<ResponseDto>               │          │
│ │ Repository:         Persistence + SQL-level Projections      │          │
│ │ Validator:          Base validations (at the edge)           │          │
│ │ Mapper:             Entity ↔ DTO                              │          │
│ │ Patterns:           Transactions, Idempotence, History       │          │
│ │                                                              │          │
│ │ .NET:  [Injectable] Service, UnitOfWork, Result<T>          │          │
│ │ Laravel: constructor DI, DB::transaction, Queue::push       │          │
│ └─────────────────────────────────────────────────────────────┘          │
│                                                                            │
│ API Contract (OpenAPI / AsyncAPI / Avro)                                  │
│ ├─ RequestDto / ResponseDto / EventDto                                    │
│ ├─ Semantic versioning (v1/, v2/)                                         │
│ └─ Contract-first: DTOs generated, never hand-written                    │
│                                                                            │
│ FRONTEND — API consumption + State Management                            │
│ ┌─────────────────────────────────────────────────────────────┐          │
│ │ Component:          User interaction                          │          │
│ │ API Service:        RequestDto → API call → ResponseDto      │          │
│ │                     Validation (Zod/class-validator)          │          │
│ │ Mapper:             ResponseDto → UI Model                   │          │
│ │ Store (NGXS/Zustand): UI Models only (never a raw DTO)        │          │
│ │ Patterns:           OnPush, React.memo, 60fps                │          │
│ │                                                              │          │
│ │ Angular:            HttpClient → Zod → NGXS                 │          │
│ │ React:              React Query / SWR → Zod → Zustand       │          │
│ └─────────────────────────────────────────────────────────────┘          │
│                                                                            │
│ MOBILE — Repository Pattern + BLoC/Riverpod                              │
│ ┌─────────────────────────────────────────────────────────────┐          │
│ │ BLoC/Riverpod:      State management                        │          │
│ │ Repository:         input → RequestDto → API → ResponseDto  │          │
│ │                     → domain Model (never a DTO)             │          │
│ │ API Service:        HTTP client                             │          │
│ │ Mapper:             ResponseDto → domain Model               │          │
│ │ Models:             Freezed + null-safety                   │          │
│ │ Patterns:           Offline sync, const constructors        │          │
│ │                                                              │          │
│ │ Flutter:            Riverpod/BLoC + Freezed                │          │
│ │ React Native:       Redux/Zustand + strict TypeScript       │          │
│ └─────────────────────────────────────────────────────────────┘          │
│                                                                            │
│ INTEGRATION — Contract-first & ACL                                        │
│ ┌─────────────────────────────────────────────────────────────┐          │
│ │ API Contract:       OpenAPI / AsyncAPI / Avro (source)      │          │
│ │ DTOs generated:     OAS Generator / Avrogen / Protoc        │          │
│ │ Endpoint:           RequestDto → Validation → Service       │          │
│ │ ACL Mapper:         External DTO → Internal Model           │          │
│ │ Patterns:           Idempotency, Circuit Breaker, Retry     │          │
│ │                                                              │          │
│ │ MuleSoft:           DataWeave to transform RequestDto       │          │
│ │ Apache Camel:       Endpoint DSL validating RequestDto      │          │
│ │ Kafka:              Avro in Schema Registry                 │          │
│ └─────────────────────────────────────────────────────────────┘          │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

Immutable direction: RequestDto → Service → ResponseDto
- Never mutate the DTO
- Never directly expose an entity
- SQL-level projections (backend) for performance
- Validation at every boundary (backend / API / frontend)
```

**Cross-cutting key points**:
- Immutable, unidirectional DTOs (Request vs Response)
- Services orchestrate, repositories execute
- Mappers transform Entity/Model → DTO and back
- Validation at the edge (controller, endpoint, API, component)
- Atomic transactions (backend) / Optimistic locking (frontend)
- Contextual logging, never a secret
- Versioned contracts (OpenAPI, AsyncAPI, Avro, Protobuf)

Consult each domain skill for exact syntax (`laravel-developer`, `dotnet-developer`, `react-developer`, `angular-developer`, `flutter-developer`, `react-native-developer`, `integration-developer`).

## Controllers — using DTOs in the presentation layer

### Laravel Controller

```php
// app/Http/Controllers/UserController.php
class UserController extends Controller {
    public function store(Request $request): JsonResponse {
        // 1. Validate input → RequestDto
        $dto = CreateUserRequestDto::fromRequest($request);
        
        // 2. Pass to the service (not to the mapper)
        $user = $this->userService->create($dto);
        
        // 3. Return via Resource (produces ResponseDto)
        return response()->json(UserResource::make($user));
    }
    
    public function show(User $user): JsonResponse {
        // Never: return response()->json($user);
        // Always: via Resource
        return response()->json(UserResource::make($user));
    }
}

// CreateUserRequestDto::fromRequest():
class CreateUserRequestDto {
    public function __construct(
        public readonly string $email,
        public readonly string $displayName,
    ) {}
    
    public static function fromRequest(Request $request): self {
        $data = Validator::make($request->all(), [
            'email' => 'required|email|unique:users',
            'displayName' => 'required|string|max:255',
        ])->validated();
        
        return new self(
            email: $data['email'],
            displayName: $data['displayName'],
        );
    }
}
```

**Rule**: the controller receives a validated `RequestDto`, calls the service, returns via a `Resource` (which produces a `ResponseDto`). **Never business logic, never a raw Model in the response.**

### .NET Controller

```csharp
// Controllers/UserController.cs
[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase {
    private readonly IUserService _userService;
    private readonly IMapper _mapper;
    
    public UserController(IUserService userService, IMapper mapper) {
        _userService = userService;
        _mapper = mapper;
    }
    
    [HttpPost]
    [ProducesResponseType(typeof(UserResponseDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] CreateUserRequestDto dto) {
        // Validation via FluentValidation (automatic via [ApiController])
        
        // Call the service
        var result = await _userService.CreateAsync(dto);
        
        // Return Result<ResponseDto>
        return result.Match(
            success: user => CreatedAtAction(nameof(GetById), new { id = user.Id }, 
                UserMapper.ToDto(user)),
            failure: error => Problem(detail: error.Message)
        );
    }
    
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(UserResponseDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetById(int id) {
        var result = await _userService.GetByIdAsync(id);
        return result.Match(
            success: user => Ok(UserMapper.ToDto(user)),
            failure: error => NotFound()
        );
    }
}

// Validation via FluentValidator (matching CreateUserRequestDto)
public class CreateUserRequestDtoValidator : AbstractValidator<CreateUserRequestDto> {
    public CreateUserRequestDtoValidator() {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.DisplayName).NotEmpty().MaximumLength(255);
    }
}

// Mapper (static, LINQ projection to avoid materialization)
public static class UserMapper {
    public static readonly Expression<Func<UserDbEntity, UserResponseDto>> ToDtoProjection =
        u => new UserResponseDto(u.Id, u.Email, u.DisplayName, u.CreatedAt);
    
    public static UserResponseDto ToDto(UserDbEntity entity) =>
        ToDtoProjection.Compile()(entity);
}
```

**Rule**: the controller receives a `RequestDto`, FluentValidator validates it, calls the service which returns `Result<Entity>`, the mapper converts via projection, returns `Result<ResponseDto>`. **Never a raw entity in JSON.**

### Angular API Service

```ts
// features/user/services/user-api.service.ts
@Injectable()
export class UserApiService {
  constructor(private http: HttpClient) {}
  
  create(form: UserFormValue): Observable<User> {
    // 1. Map: form → RequestDto
    const dto = userMapper.toCreateRequest(form);
    
    // 2. POST RequestDto
    return this.http.post<UserResponseDto>('/api/users', dto).pipe(
      // 3. Map: ResponseDto → UI Model
      map(dto => userMapper.toModel(dto)),
    );
  }
  
  getById(id: number): Observable<User> {
    return this.http.get<UserResponseDto>(`/api/users/${id}`).pipe(
      map(dto => userMapper.toModel(dto)),
    );
  }
}

// usage in a component:
export default component({
  selector: 'app-user-form',
  template: `
    <form [formGroup]="form">
      <input formControlName="email" />
      <button (click)="submit()">Save</button>
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormComponent {
  form = inject(FormBuilder).group({
    email: ['', Validators.required],
    displayName: ['', Validators.required],
  });
  
  private userApi = inject(UserApiService);
  private userStore = inject(UserStore);
  
  submit() {
    // The service calls userMapper → API → userMapper → Model → store
    // The component NEVER touches the DTO
    this.userApi.create(this.form.value).subscribe(user => {
      this.userStore.addUser(user);
    });
  }
}
```

**Rule**: the API service receives form (or store) data, maps to `RequestDto`, calls the endpoint, receives `ResponseDto`, maps to `UI Model`, returns it to the caller. **The component never sees the DTO.**

### React Hook + TanStack Query

```ts
// features/user/api/user-api.ts
const userQueryKeys = {
  all: ['users'] as const,
  byId: (id: number) => [...userQueryKeys.all, id] as const,
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (form: UserFormValue): Promise<User> => {
      // 1. Map: form → RequestDto
      const dto = userMapper.toCreateRequest(form);
      
      // 2. POST + Zod parse
      const response = await fetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(dto),
      }).then(r => r.json());
      
      const validatedDto = UserResponseDtoSchema.parse(response);
      
      // 3. Map: ResponseDto → UI Model
      return userMapper.toModel(validatedDto);
    },
    onSuccess: (user) => {
      // The Zustand store receives the UI Model, not the DTO
      userStore.addUser(user);
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
};

// usage in a component:
export function UserForm() {
  const form = useForm<UserFormValue>();
  const { mutate, isPending } = useCreateUser();
  
  const handleSubmit = form.handleSubmit((data) => {
    mutate(data);
    // The component never touches a DTO
  });
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

**Rule**: the hook (or service) receives form data, maps to `RequestDto`, sends it, receives `ResponseDto`, validates with Zod, maps to `UI Model`, stores in Zustand. **The component only knows the UI Model.**

### Flutter Repository

```dart
// data/repositories/user_repository.dart
class UserRepository extends IUserRepository {
  final ApiClient _apiClient;
  
  @override
  Future<User> create(CreateUserInput input) async {
    // 1. Map: input → RequestDto
    final dto = CreateUserRequestDto(
      email: input.email,
      displayName: input.displayName,
    );
    
    // 2. POST RequestDto
    final response = await _apiClient.post('/users', data: dto.toJson());
    
    // 3. Parse DTO + map to domain Model
    final responseDto = UserResponseDto.fromJson(response);
    return responseDto.toDomain();
  }
  
  @override
  Future<User> getById(int id) async {
    final response = await _apiClient.get('/users/$id');
    final responseDto = UserResponseDto.fromJson(response);
    return responseDto.toDomain();
  }
}

// The BLoC receives domain Models, never DTOs:
class UserBloc extends Bloc<UserEvent, UserState> {
  final UserRepository _repository;
  
  UserBloc(this._repository) : super(UserInitial()) {
    on<CreateUserEvent>((event, emit) async {
      emit(UserLoading());
      final user = await _repository.create(event.input);
      // user is a domain Model, not a DTO
      emit(UserCreated(user));
    });
  }
}
```

**Rule**: the repository maps input → `RequestDto`, calls the API, receives `ResponseDto`, maps to a domain Model, returns it. **The BLoC/Riverpod and the presentation layer only see Models.**

## Frontend — Deep dive (Angular / React)

> The backend is the source of the contract; this section covers the **DTO lifecycle on the client side**: validation, mapping, state, errors. Golden rule: **the DTO only lives between the API service and the mapper. Store, components, and templates only handle UI Models.**

### 1. Frontend validation — the DTO is a contract, not a form

Two distinct validations, not to be confused:

| What | Where | Tool |
|------|-----|-------|
| **User input** (form) | On the form, before mapping to `RequestDto` | Typed Reactive Forms (Angular) · React Hook Form + Zod (React) |
| **API response** (received `ResponseDto`) | At the boundary, before the mapper | `zod.parse()` (React/RN) · type guard (Angular) |

The `RequestDto`/`ResponseDto` itself has **no** validation logic — it's a contract.

#### Angular — Typed Reactive Forms
```ts
// Typed form → guarantees the shape before mapping (never validate the DTO itself)
form = inject(FormBuilder).nonNullable.group({
  email:       ['', [Validators.required, Validators.email]],
  displayName: ['', [Validators.required, Validators.maxLength(255)]],
});
// mapper: userMapper.toCreateRequest(form.getRawValue())  // getRawValue() = strictly typed
```
- Always `nonNullable` + `getRawValue()` (avoids `string | null`).
- The received `ResponseDto` is validated by a **type guard** (or `zod` if installed) before the mapper.

#### React — Zod = single source (type + runtime)
```ts
// schemas/user.schema.ts
export const UserResponseDtoSchema = z.object({
  id:         z.string().uuid(),
  email:      z.string().email(),
  displayName: z.string(),
  createdAt:  z.string().datetime(),          // ISO string (contract)
  archivedAt: z.string().datetime().nullable(),
});
export type UserResponseDto = z.infer<typeof UserResponseDtoSchema>;  // type DERIVED from the schema

// Form: same approach for input (React Hook Form)
export const UserFormSchema = z.object({ email: z.string().email(), displayName: z.string().min(1) });
// useForm({ resolver: zodResolver(UserFormSchema) })
```
- **The DTO type is derived from the Zod schema** (`z.infer`) — never two declarations to keep in sync.
- `.parse()` at the API boundary: a backend divergence is caught **immediately at runtime**, not via a silent `undefined` three screens later.

### 2. Frontend mappers — directives

| Rule | Application |
|-------|-------------|
| **Pure function** | `toModel(dto): Model` — no side effect, no API call |
| **Parse dates** | `new Date(dto.createdAt)` — the DTO carries an ISO string, the UI Model a `Date` |
| **Enum → typed union** | explicit map or guard; never a blind `as` on an external value |
| **Nullable → UI default** | `displayName: dto.displayName ?? '—'` — no raw `null` leaking into the template |
| **Derived computed fields here** | `isRecent`, `fullName` derived in the mapper, not in the component |
| **Immutable** | never mutate the received DTO; return a new Model object |

#### Nullability — the classic trap
```ts
// DTO (contract): archivedAt can be null → decide on a clear UI semantics
toModel: (dto: UserResponseDto): User => ({
  id: dto.id,
  displayName: dto.displayName,
  createdAt: new Date(dto.createdAt),
  isArchived: dto.archivedAt !== null,                         // null → explicit boolean
  archivedAt: dto.archivedAt ? new Date(dto.archivedAt) : undefined,
});
```
- `tsconfig`: `"strict": true` + `"strictNullChecks": true` (ideally `exactOptionalPropertyTypes`).
- A `nullable` field on the DTO **must** be handled in the mapper — never left to leak through as-is.

### 3. State — the store only holds UI Models

| Angular (NGXS / signals) | React |
|--------------------------|-------|
| State = `Model[]` or `Record<id, Model>` | **Server state** → TanStack Query (cache, invalidation) |
| Typed selectors return Models | **UI state** (filters, selection, modal) → Zustand |
| Actions receive Models (post-mapping) | actions/setters receive Models |

- **Forbidden**: `store.users: UserResponseDto[]`. Always `store.users: User[]` (UI Model).
- **React**: don't duplicate TanStack Query's server-state in Zustand. TanStack = server data (cache/staleness); Zustand = local UI state.

### 4. Errors & loading — at the API boundary

```ts
// React — the queryFn parses and lets the error bubble up; the UI handles states
useQuery({
  queryKey: userQueryKeys.byId(id),
  queryFn: async () => UserResponseDtoSchema.parse(await fetchJson(`/api/users/${id}`)),
});
// → isLoading / isError / error exposed to the component: explicit UI states
```
- Map HTTP errors → a UI domain message/state (**never** display the raw server body).
- **A Zod `.parse()` failure is a contract bug**: log it (e.g. Sentry) + error state, never "fix" it silently.
- Always three UI states: `loading` · `error` · `empty` (an empty list is not an error).

### 5. Frontend tests (parity with the backend round-trip)
- **Mapper** test: `toModel(sampleDto)` produces the expected Model (parsed dates, handled nullables, correct computed values).
- **Zod schema** test against a real payload (fixture copied from the API) — catches a backend/frontend contract divergence.
- Test: the store never holds an object carrying a DTO-specific key (e.g. snake_case `created_at` instead of `createdAt`).

### Frontend checklist
- [ ] DTO type derived from the Zod schema (`z.infer`) — no double declaration (React/RN)
- [ ] `.parse()` (Zod) or type guard at the API boundary **before** the mapper
- [ ] Validated form (typed Reactive Forms / RHF + `zodResolver`) — distinct from the DTO
- [ ] Pure mapper: parsed dates, guarded enums, **nullables → UI default**, derived computed fields
- [ ] Store (NGXS / Zustand) = UI Models only, never a `ResponseDto`
- [ ] Server state (React) in TanStack Query, not duplicated in Zustand
- [ ] UI states `loading` / `error` / `empty` handled; HTTP errors mapped (no raw body)
- [ ] Strict `tsconfig` + `strictNullChecks`; no `any` on a DTO
- [ ] Tests: mapper + Zod schema against a real fixture

## Deliverable checklist — check before shipping

- [ ] DTOs placed in the framework's standard folder (see table above)
- [ ] `RequestDto` / `ResponseDto` suffix respected (never bare `Dto`)
- [ ] **Controller pattern** respected:
  - **Backend**: controller receives `RequestDto`, validates, calls the service, returns `ResponseDto` via mapper/Resource. Never a raw Model/Entity in JSON.
  - **Frontend/Mobile**: API service receives form data, maps to `RequestDto`, sends, receives `ResponseDto`, maps to UI Model, stores. The component never sees the raw DTO.
- [ ] No EF/Eloquent/Mongo entity exposed in an API response — always goes through a DTO/Resource
- [ ] Validation present on `RequestDto`s (FluentValidation, Laravel Validator, Zod, Freezed guards) + frontend side (Reactive Forms, React Hook Form)
- [ ] Dedicated mapper (static / Resource / pure function), no inline mapping in the controller/component/hook
- [ ] Frontend: DTO parsed into a UI Model **before** entering the store — the component never sees the raw DTO
- [ ] .NET backend: `Expression<Func<>>` projection used to avoid materialization
- [ ] No sensitive field in a `ResponseDto` (password, hash, token, unneeded PII)
- [ ] Consistent field naming backend ↔ frontend (document if the convention differs: camelCase vs snake_case)
- [ ] Documentation: OpenAPI/Swagger annotation on each exposed DTO (generated schema)
- [ ] Tests: at minimum a test verifying the `json → DTO → Model → DTO → json` round-trip + a controller/API test (in/out DTOs)

## Optional input (if invoked from a parent skill)

If the parent skill (`laravel-developer`, `dotnet-developer`, `angular-developer`, `react-developer`, `flutter-developer`, `react-native-developer`, `integration-developer`) provides:
- **framework** + **feature to implement** + **direction (Request/Response/Event)** + **fields**

→ skip Phase 1 (context) and generate the files directly in the standard folder.

## Workflow

### Phase 1 — Context (if invoked directly)

Ask via AskUserQuestion:
1. Target stack (Laravel / .NET / Angular / React / Flutter / React Native / integration)
2. DTO direction (Request / Response / Event / several)
3. Business feature concerned
4. Fields and types

### Phase 2 — Generation

1. Create the DTO file(s) in the right location (see the per-framework table above).
2. Create the associated validator(s) (FluentValidation, inline Validator, Zod schema, Freezed guards).
3. Create the mapper(s) — Laravel Resource, .NET static class, pure TS/Dart function.
4. Document in the generated file: `@see dto-architect` at the top of the file.

### Phase 3 — Verification

Run through the deliverable checklist and return:
- Created files (full paths)
- Points of attention (versions, filtered sensitive fields, mapping used)
- Recommended next step (backend → mirrored frontend, or vice versa)

## Anti-patterns to explicitly refuse

1. **`return $user`** in a Laravel controller — refuse, require a `UserResource` or `UserResponseDto`.
2. **`public IActionResult Get() => Ok(userDbEntity)`** in .NET — **CRITICAL BUG** — refuse absolutely, require `UserMapper.ToDto()`. `DbEntity`s must **never** leave Infrastructure.
3. **A single `UserDto`** for all directions — refuse, separate Request/Response.
4. **DTO with a business method** (`$dto->isActive()`) — refuse, logic goes in the domain Model.
5. **DbEntity exposed in JSON** (raw navigation, serialization) — refuse, use a DTO or IDs. Example: `Ok(demande)` exposes `demande.Address` which exposes `address.Zone` which exposes... = N+1 and data leak.
6. **Frontend: a component binding the API DTO directly** — refuse, require mapping to a UI Model.
7. **An "in case" optional field** in a DTO — refuse, a field in a DTO is a guaranteed contract.
8. **Modifying an existing DTO used in production** — refuse, create `V2` and migrate.
9. **DbEntity in a service constructor** — refuse, services receive DTOs or IDs. If the DbEntity must be fetched from the DB, that's the repository's job.
</content>
