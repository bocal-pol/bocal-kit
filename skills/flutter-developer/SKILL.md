---
name: flutter-developer
description: Flutter/Dart development — screens, BLoC/Riverpod, go_router navigation, flutter_test tests. Invoke to create or audit Flutter code.
model: claude-sonnet-5
user-invocable: true
argument-hint: "[--build|--review] [description]"
type: framework
priority: high
scope: mobile
dependencies:
  - context7-mcp
  - dto-architect
conflicts:
  - react-native-developer
---

# flutter-developer

Develops or audits Flutter code following Dart null-safety conventions, separated architecture, and
mandatory tests.

## 📦 DTOs — delegated to `dto-architect`

The repository exposes **domain Models**, never DTOs. The DTO is an implementation detail of the
`data` layer.

- **Mandatory location**:
  - `lib/data/dtos/` → `<feature>_request_dto.dart`, `<feature>_response_dto.dart` (Freezed +
    `@JsonSerializable()`)
  - `lib/data/mappers/` → `<feature>_mapper.dart` (extension on the DTO: `dto.toDomain()`)
  - `lib/domain/models/` → `<feature>.dart` (Freezed domain Model, exposed to BLoC/Riverpod and the
    UI)
  - `lib/domain/repositories/` → signature `Future<User>`, never `Future<UserResponseDto>`
- **Minimal rules**:
  - Freezed + `@JsonSerializable()` mandatory on every DTO (fromJson/toJson generated — never
    written manually)
  - Strict `_request_dto.dart` / `_response_dto.dart` suffix
  - DTO → domain mapping lives in the **repository** (not in the BLoC / Riverpod / Widget)
  - BLoC/Riverpod only know domain Models; the presentation layer even less
  - Strict `null-safety`: a non-nullable field in the domain = a guard in the mapper if the DTO
    potentially leaves it null
- **When to create a DTO**: every called HTTP endpoint, every consumed message (WebSocket, MQTT,
  structured push notification).
- **Full detail (versioning, generated OpenAPI, round-trip tests)** → see the `dto-architect` skill.

## Optional input

If invoked from `mobile-agent`, framework/version/description parameters are already provided —
skip Phase 1.

## Phase 1 — Context

Via AskUserQuestion if not provided:

```
Flutter Developer — Context
─────────────────────────────
1. Mode: [ ] --build   [ ] --review
2. Flutter version (or detect from pubspec.yaml):
3. State management: [ ] Riverpod   [ ] BLoC   [ ] Provider   [ ] simple setState
4. Navigation: [ ] go_router   [ ] Navigator 2.0   [ ] Other
5. Screen/feature description:
```

## Phase 2 — Discovery

> ⚠️ Discovery rule: read pubspec.yaml before any code generation.

Read `pubspec.yaml`:
- Flutter SDK version + Dart version
- State packages (flutter_bloc, riverpod, provider...)
- Navigation (go_router, auto_route...)
- HTTP (dio, http...)
- Tests (mockito, mocktail, bloc_test...)
- Code gen (freezed, json_serializable, build_runner...)

```bash
# Detect the installed Flutter version
flutter --version 2>/dev/null | head -1
```

## Phase 3 — File structure

> ⚠️ Structure rule: feature-first, not layer-first.

```text
lib/
├── features/
│   └── [feature]/
│       ├── data/
│       │   ├── models/        # Freezed DTOs
│       │   └── repositories/  # Implementation
│       ├── domain/
│       │   ├── entities/      # Business entities
│       │   └── repositories/  # Abstract interfaces
│       └── presentation/
│           ├── bloc/          # BLoC or Riverpod Notifier
│           ├── screens/       # Screens (one file = one screen)
│           └── widgets/       # Reusable components
├── core/
│   ├── router/                # go_router configuration
│   ├── theme/                 # ThemeData, tokens
│   └── di/                   # Dependency injection
└── main.dart
```

## Phase 4 — Code conventions

> ⚠️ Dart rule: strict null-safety, no `!` unless absolutely certain.

### Freezed model

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'feature.freezed.dart';
part 'feature.g.dart';

@freezed
class Feature with _$Feature {
  const factory Feature({
    required String id,
    required String name,
    @Default(true) bool active,
  }) = _Feature;

  factory Feature.fromJson(Map<String, dynamic> json) =>
      _$FeatureFromJson(json);
}
```

### Repository

```dart
abstract class FeatureRepository {
  Future<List<Feature>> getAll();
  Future<Feature> getById(String id);
  Future<void> create(Feature feature);
}

class FeatureRepositoryImpl implements FeatureRepository {
  const FeatureRepositoryImpl(this._client);

  final Dio _client;

  @override
  Future<List<Feature>> getAll() async {
    final response = await _client.get<List<dynamic>>('/features');
    return (response.data ?? [])
        .map((e) => Feature.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
```

### BLoC

```dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'feature_bloc.freezed.dart';

@freezed
class FeatureEvent with _$FeatureEvent {
  const factory FeatureEvent.load() = _Load;
  const factory FeatureEvent.delete(String id) = _Delete;
}

@freezed
class FeatureState with _$FeatureState {
  const factory FeatureState.initial() = _Initial;
  const factory FeatureState.loading() = _Loading;
  const factory FeatureState.loaded(List<Feature> features) = _Loaded;
  const factory FeatureState.error(String message) = _Error;
}

class FeatureBloc extends Bloc<FeatureEvent, FeatureState> {
  FeatureBloc(this._repository) : super(const FeatureState.initial()) {
    on<_Load>(_onLoad);
    on<_Delete>(_onDelete);
  }

  final FeatureRepository _repository;

  Future<void> _onLoad(_Load event, Emitter<FeatureState> emit) async {
    emit(const FeatureState.loading());
    try {
      final features = await _repository.getAll();
      emit(FeatureState.loaded(features));
    } catch (e) {
      emit(FeatureState.error(e.toString()));
    }
  }
}
```

### Riverpod (alternative)

```dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'feature_provider.g.dart';

@riverpod
Future<List<Feature>> features(FeaturesRef ref) async {
  final repository = ref.watch(featureRepositoryProvider);
  return repository.getAll();
}

@riverpod
class FeatureNotifier extends _$FeatureNotifier {
  @override
  Future<List<Feature>> build() async {
    return ref.watch(featuresProvider.future);
  }

  Future<void> delete(String id) async {
    final repository = ref.read(featureRepositoryProvider);
    await repository.delete(id);
    ref.invalidateSelf();
  }
}
```

### Screen

```dart
class FeatureScreen extends StatelessWidget {
  const FeatureScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => FeatureBloc(context.read())..add(const FeatureEvent.load()),
      child: Scaffold(
        appBar: AppBar(title: const Text('Features')),
        body: BlocBuilder<FeatureBloc, FeatureState>(
          builder: (context, state) => state.map(
            initial: (_) => const SizedBox.shrink(),
            loading: (_) => const Center(child: CircularProgressIndicator()),
            loaded: (s) => _FeatureList(features: s.features),
            error: (s) => _ErrorView(message: s.message),
          ),
        ),
      ),
    );
  }
}

class _FeatureList extends StatelessWidget {
  const _FeatureList({required this.features});

  final List<Feature> features;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: features.length,
      itemBuilder: (context, index) => ListTile(
        key: ValueKey(features[index].id),
        title: Text(features[index].name),
      ),
    );
  }
}
```

### go_router

```dart
final router = GoRouter(
  initialLocation: '/',
  routes: [
    GoRoute(
      path: '/',
      builder: (context, state) => const HomeScreen(),
    ),
    GoRoute(
      path: '/features',
      builder: (context, state) => const FeatureScreen(),
    ),
    GoRoute(
      path: '/features/:id',
      builder: (context, state) => FeatureDetailScreen(
        id: state.pathParameters['id']!,
      ),
    ),
  ],
);
```

## Phase 5 — Tests

> ⚠️ Testing rule: BLoC tested with `bloc_test`, repository mocked with `mocktail`.

```dart
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

class MockFeatureRepository extends Mock implements FeatureRepository {}

void main() {
  late MockFeatureRepository repository;
  late FeatureBloc bloc;

  setUp(() {
    repository = MockFeatureRepository();
    bloc = FeatureBloc(repository);
  });

  tearDown(() => bloc.close());

  group('FeatureBloc', () {
    final features = [
      const Feature(id: '1', name: 'Feature A'),
      const Feature(id: '2', name: 'Feature B'),
    ];

    blocTest<FeatureBloc, FeatureState>(
      'emits [loading, loaded] on successful Load',
      setUp: () => when(() => repository.getAll()).thenAnswer((_) async => features),
      build: () => bloc,
      act: (b) => b.add(const FeatureEvent.load()),
      expect: () => [
        const FeatureState.loading(),
        FeatureState.loaded(features),
      ],
    );

    blocTest<FeatureBloc, FeatureState>(
      'emits [loading, error] on repository failure',
      setUp: () => when(() => repository.getAll()).thenThrow(Exception('Network error')),
      build: () => bloc,
      act: (b) => b.add(const FeatureEvent.load()),
      expect: () => [
        const FeatureState.loading(),
        isA<FeatureState>().having((s) => s, 'error state', isA<_Error>()),
      ],
    );
  });
}
```

```bash
# Run tests
flutter test

# With coverage
flutter test --coverage
genhtml coverage/lcov.info -o coverage/html
```

## Phase 6 — Build runner commands

```bash
# Generate Freezed + Riverpod code
dart run build_runner build --delete-conflicting-outputs

# Watch mode during development
dart run build_runner watch --delete-conflicting-outputs
```

## Phase 7 — Pre-delivery checklist

- [ ] `flutter analyze` — zero warnings
- [ ] `dart format .` — formatting applied
- [ ] `flutter test` — all tests pass
- [ ] No unjustified `!` (null assertion)
- [ ] `const` on every static widget constructor
- [ ] `Semantics` on interactive elements with no visual label
- [ ] `build_runner build` run after Freezed/Riverpod changes

## Conditional persistence

⚠️ Skip if invoked from `mobile-agent` — memory is handled by the agent.

Otherwise, record in memory: framework version, chosen state manager, navigation pattern.
