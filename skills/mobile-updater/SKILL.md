---
name: mobile-updater
description: Mobile technology watch — obsolete Flutter/React Native patterns, prioritized migration report with commands. Invoke to analyze a mobile version upgrade or audit dependencies.
model: claude-sonnet-5
user-invocable: true
argument-hint: "[flutter|react-native] [target-version]"
type: utility
priority: low
scope: mobile
dependencies: []
conflicts: []
---

# mobile-updater

Analyzes obsolete patterns and generates a prioritized migration report for Flutter and React Native.

## Optional input

If invoked from `mobile-agent`, the framework/version parameters are already provided — skip Phase 1.

## Phase 1 — Context

Via AskUserQuestion if not provided:

```
Mobile Updater — Context
─────────────────────────
1. Framework: [ ] Flutter   [ ] React Native
2. Current version (or detect from pubspec.yaml / package.json):
3. Target version (or "latest"):
4. Mode: [ ] Migration only   [ ] Technology watch   [ ] Both
```

## Phase 2 — Discovery

> ⚠️ Discovery rule: read the manifests before any diagnosis.

**Flutter**:
```bash
cat pubspec.yaml
cat pubspec.lock | grep -E "^  (flutter|dart|riverpod|bloc|go_router|freezed|dio):" -A 2
flutter --version 2>/dev/null
```

**React Native**:
```bash
cat package.json | python -m json.tool 2>/dev/null || cat package.json
cat app.json 2>/dev/null || cat app.config.ts 2>/dev/null | head -20
```

## Phase 3 — Version calendar

### Flutter

| Version | Dart SDK | Status | Support end |
| ------- | -------- | ------ | ----------- |
| 3.10 | 3.0 | EOL | 2024-05 |
| 3.16 | 3.2 | EOL | 2024-11 |
| 3.19 | 3.3 | EOL | 2025-02 |
| 3.22 | 3.4 | Standard support | 2025-08 |
| 3.24 | 3.5 | Current stable | 2025-11 |
| 3.27+ | 3.6+ | Latest stable | Ongoing |

### React Native

| Version | React | Status | Notes |
| ------- | ----- | ------ | ----- |
| 0.71 | 18 | EOL | Old architecture |
| 0.73 | 18 | EOL | |
| 0.74 | 18 | End of support | |
| 0.75 | 18 | Stable | |
| 0.76 | 18 | Stable — New Architecture enabled by default | |
| 0.77+ | 19 | Latest stable | React 19 required |

### Expo SDK

| SDK | RN version | Status |
| --- | ---------- | ------ |
| 50 | 0.73 | EOL |
| 51 | 0.74 | EOL |
| 52 | 0.76 | Stable |
| 53+ | 0.77+ | Latest stable |

## Phase 4 — Obsolete Flutter patterns

> ⚠️ Scan rule: grep `lib/` with exclusions `*.g.dart`, `*.freezed.dart`.

| # | Obsolete pattern | Modern pattern | Since |
| - | ---------------- | --------------- | ------ |
| 1 | `MaterialApp(home: ...)` without GoRouter | `MaterialApp.router(routerConfig: router)` | Flutter 3.0 |
| 2 | `Navigator.push(context, MaterialPageRoute(...))` | `context.go('/route')` with go_router | 3.0 |
| 3 | `StatefulWidget` for external state | BLoC or Riverpod | 2.0 |
| 4 | `setState(() {...})` for shared state | Centralized store | 2.0 |
| 5 | `Provider` (non-Riverpod) | Riverpod 2.x | 3.0 |
| 6 | `FutureBuilder` / `StreamBuilder` | Riverpod `FutureProvider` / `StreamProvider` | 3.0 |
| 7 | `extends ChangeNotifier` | Riverpod `AsyncNotifier` / `Notifier` | 3.10 |
| 8 | `riverpod` without `riverpod_annotation` | `@riverpod` code generation | 3.16 |
| 9 | `flutter_bloc` without `bloc_test` | Always pair the two | 3.0 |
| 10 | `Bloc` without `on<Event>` (`mapEventToState` method) | `on<Event>((event, emit) => ...)` | 3.0 |
| 11 | `Color(0xFF...)` | `Color.fromARGB(...)` or `Colors.xxx` | 3.0 |
| 12 | `ThemeData(accentColor: ...)` | `ColorScheme.fromSeed(...)` | 3.0 |
| 13 | `TextTheme.headline6` | `TextTheme.titleLarge` | 3.0 |
| 14 | `FlatButton`, `RaisedButton`, `OutlineButton` | `TextButton`, `ElevatedButton`, `OutlinedButton` | 2.0 |
| 15 | `Scaffold(floatingActionButton: ...)` without `heroTag` | Add `heroTag: null` with multiple FABs | 2.0 |
| 16 | `MediaQuery.of(context).size` in build | `MediaQuery.sizeOf(context)` | 3.10 |
| 17 | `Theme.of(context)` deep in build | Extract into a dedicated widget | 3.0 |
| 18 | `http` package alone | `dio` with interceptors | 3.0 |
| 19 | Models without `Freezed` | `@freezed` classes with code gen | 3.0 |
| 20 | Manual `json_decode` | `json_serializable` + `fromJson` | 2.0 |
| 21 | `flutter_test` without golden tests | Add golden tests for critical components | 3.16 |
| 22 | No `const` on static constructors | Prefix all static widgets with `const` | 2.0 |
| 23 | `pubspec.yaml` without `flutter.uses-material-design: true` | Required for Material 3 | 3.16 |

## Phase 5 — Obsolete React Native patterns

> ⚠️ Scan rule: grep `src/` with exclusions `node_modules/`, `*.test.*`, `*.spec.*`.

| # | Obsolete pattern | Modern pattern | Since |
| - | ---------------- | --------------- | ------ |
| 1 | Old architecture (without Fabric/JSI) | New Architecture enabled (RN 0.76+) | 0.76 |
| 2 | `class Component extends React.Component` | Functional components + hooks | 0.64 |
| 3 | Global centralized `StyleSheet.create({})` | Component-local styles | 0.70 |
| 4 | `useEffect` for fetching with no cleanup | TanStack Query or local cache | 0.71 |
| 5 | `useState` + `useEffect` for server data | TanStack Query `useQuery` | 0.71 |
| 6 | Redux without Redux Toolkit | Redux Toolkit or Zustand | 0.71 |
| 7 | React Redux `connect()` (HOC) | `useSelector` + `useDispatch` hooks | 0.71 |
| 8 | Direct `AsyncStorage` | `@react-native-async-storage/async-storage` | 0.68 |
| 9 | `@react-navigation/stack` | `@react-navigation/native-stack` (native) | 6.0 |
| 10 | Navigation without `ParamList` types | `NativeStackScreenProps<ParamList, 'Screen'>` | 6.0 |
| 11 | `TouchableOpacity` / `TouchableHighlight` | `Pressable` | 0.64 |
| 12 | `Image` for remote images with no cache | `expo-image` or `react-native-fast-image` | 0.72 |
| 13 | `ScrollView` for long lists | `FlatList` or `FlashList` | 0.60 |
| 14 | `FlatList` without `keyExtractor` | Always provide `keyExtractor` | 0.60 |
| 15 | List components without `React.memo` | Systematic `memo()` on item components | 0.64 |
| 16 | `fetch()` with no timeout or AbortController | `axios` with a timeout or `AbortController` | 0.70 |
| 17 | `console.log` in prod | Remove or replace with a conditional logger | 0.60 |
| 18 | Inline `Platform.OS === 'ios' ? X : Y` | Platform-specific components (`X.ios.tsx`) | 0.60 |
| 19 | Tests without `@testing-library/react-native` | Adopt Testing Library | 0.71 |
| 20 | No `accessibilityLabel` on Pressable | Required on every interactive element | 0.60 |
| 21 | Not using `expo install` | Always `npx expo install` (compatible versions) | SDK 46 |
| 22 | Static `app.json` | Dynamic `app.config.ts` | SDK 45 |
| 23 | `babel-plugin-module-resolver` for aliases | `tsconfig.json` paths + Metro config | 0.73 |

## Phase 6 — Migration report

Generate `mobile/YYYY-MM-DD_migration-[framework].md`:

```markdown
# Migration Report [Flutter/React Native] — YYYY-MM-DD

## Version
| | Value |
|-|--------|
| Current version | X.X.X |
| Target version | X.X.X |

## Summary
- Breaking changes identified: N
- Obsolete patterns detected: N
- Files impacted: N

## 🔴 Breaking (blocks migration)
| File | Obsolete pattern | Required action |
| ------- | ---------------- | -------------- |

## 🟠 Important (fix this sprint)
| File | Obsolete pattern | Recommended action |
| ------- | ---------------- | ------------------ |

## 🟡 Recommended (next iteration)
| # | Pattern | Benefit |
| - | ------- | -------- |

## 🟢 Optional (housekeeping)
| # | Pattern | Note |
| - | ------- | ---- |

## Sequenced migration plan

### Step 1 — Update manifests
\`\`\`bash
# Flutter
flutter upgrade
flutter pub upgrade --major-versions

# React Native / Expo
npx expo upgrade [sdk-version]
npx react-native upgrade
\`\`\`

### Step 2 — Breaking changes

### Step 3 — Important patterns

### Step 4 — Regression tests
\`\`\`bash
# Flutter
flutter test
flutter analyze

# React Native
npx jest
npx tsc --noEmit
\`\`\`
```

## Conditional persistence

⚠️ Skip if invoked from `mobile-agent` — memory is handled by the agent.

Otherwise, record in memory: current version, critical patterns detected, report date.
