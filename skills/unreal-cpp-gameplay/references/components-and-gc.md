# Components, garbage collection & replication primer (UE 5.8 C++)

Deep dive for `unreal-cpp-gameplay`. Checked against the Gameplay Framework docs and the UE5 C++
programming references. Covers creating/attaching components, the UPROPERTY/GC ownership rules
that trip up newcomers, and a minimal replication example.

Contents:
- Creating and attaching components (constructor vs. runtime)
- Garbage collector ownership (`UPROPERTY`, `TObjectPtr`, `TWeakObjectPtr`, `TStrongObjectPtr`,
  `FGCObject`)
- USTRUCT and UENUM for reflected data
- Minimal replication (`ReplicatedUsing`, `DOREPLIFETIME`)
- Pitfalls

## Creating and attaching components

Default subobjects are created in the constructor; runtime components use `NewObject` +
`RegisterComponent`.

```cpp
// In the constructor — baked into the Class Default Object, editable in the Blueprint subclass.
ACharacterBase::ACharacterBase()
{
    SpringArm = CreateDefaultSubobject<USpringArmComponent>(TEXT("SpringArm"));
    SpringArm->SetupAttachment(RootComponent);          // attach to an existing component
    SpringArm->TargetArmLength = 300.f;

    Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
    Camera->SetupAttachment(SpringArm);                 // socket chain: root -> arm -> camera
}
```

```cpp
// At runtime (e.g. adding a component after spawn):
UAudioComponent* Audio = NewObject<UAudioComponent>(this);
Audio->RegisterComponent();                              // required, or it never ticks/renders
Audio->AttachToComponent(RootComponent, FAttachmentTransformRules::KeepRelativeTransform);
```

- `CreateDefaultSubobject` is only valid inside a constructor; calling it later triggers an
  assert.
- `SetupAttachment` is for hierarchy at constructor time; `AttachToComponent` is the runtime call.

## Garbage collector ownership (newcomers' #1 crash)

UE's garbage collector only keeps `UObject`s alive if it can reach them through a reflected
reference. A raw `UObject*` member that isn't a `UPROPERTY` is invisible to the GC and can be
collected, leaving a dangling pointer.

```cpp
UPROPERTY()                                  // the GC sees it -> stays alive as long as this owner lives
TObjectPtr<UMyDataObject> Data;

UPROPERTY()
TArray<TObjectPtr<AActor>> Tracked;          // containers of UObject also need UPROPERTY

UMyDataObject* Raw;                           // BUG: untracked; can be collected -> crash
```

Rules:
- Every `UObject`/Actor pointer that must persist gets a `UPROPERTY` (use `TObjectPtr<T>` in UE5;
  raw pointers still compile but `TObjectPtr` adds editor access tracking).
- Plain C++ data (ints, FString, FVector, POD USTRUCTs) doesn't need it — it's owned by value.
- For a UObject created without a UPROPERTY owner (rare), `AddToRoot()` pins it and
  `RemoveFromRoot()` releases it — but prefer proper ownership.
- A plain C++ class (not a UObject) can't use `UPROPERTY`. Hold UObjects there with
  `TStrongObjectPtr<T>`, or derive from `FGCObject` and report them in
  `AddReferencedObjects` (this also requires `GetReferencerName`).
- For references that must *not* keep the target alive (a cached target actor, a listener), use
  `TWeakObjectPtr<T>` and check `IsValid()`/`Get()` before every use.

## USTRUCT and UENUM for reflected data

```cpp
UENUM(BlueprintType)
enum class EWeaponType : uint8 { Pistol, Rifle, Shotgun };

USTRUCT(BlueprintType)
struct FWeaponStats
{
    GENERATED_BODY()
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Damage = 10;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float FireRate = 0.25f;
};
```

`BlueprintType` makes the enum/struct usable as Blueprint variables.

## Minimal replication (multiplayer)

```cpp
// Header
UPROPERTY(ReplicatedUsing = OnRep_Health)
float Health = 100.f;

UFUNCTION()
void OnRep_Health();                          // client callback when Health replicates

// Source
#include "Net/UnrealNetwork.h"
void AMyActor::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& Out) const
{
    Super::GetLifetimeReplicatedProps(Out);
    DOREPLIFETIME(AMyActor, Health);          // registers the property for replication
}
```

- Set `bReplicates = true;` in the constructor so the actor replicates at all.
- Server authority: gameplay changes happen on the server; clients receive replicated state and
  react in `OnRep_` callbacks.

## Pitfalls

- `NewObject` without `RegisterComponent` gives a component that exists but never ticks or
  renders.
- Forgetting `#include "Net/UnrealNetwork.h"` breaks `DOREPLIFETIME`.
- `TObjectPtr` implicitly converts to the raw pointer for calls, so existing `->`/`.` usage stays
  unchanged; the difference is GC visibility and editor tooling, not call-site syntax.
