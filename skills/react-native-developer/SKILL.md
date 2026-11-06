---
name: react-native-developer
description: React Native development — screens, Zustand/Redux, React Navigation, Expo or bare workflow, Jest + Testing Library. Invoke to create or audit React Native code.
model: claude-sonnet-5
user-invocable: true
argument-hint: "[--build|--review] [description]"
type: framework
priority: medium
scope: mobile
dependencies:
  - context7-mcp
  - dto-architect
conflicts:
  - flutter-developer
---

# react-native-developer

Develops or audits React Native code following strict TypeScript conventions, a feature-first architecture, and mandatory tests.

## 📦 DTOs — delegated to `dto-architect`

Screens and the Zustand store only know **UI Models**. The DTO received from the API is parsed by Zod then converted into a Model by a mapper.

- **Mandatory location**:
  - `src/dtos/` → `<feature>-request.dto.ts`, `<feature>-response.dto.ts` (interfaces mirroring the backend)
  - `src/schemas/` → `<feature>.schema.ts` (Zod schemas)
  - `src/models/` → `<feature>.model.ts` (UI Model: parsed dates, computed properties)
  - `src/mappers/` → `<feature>.mapper.ts` (pure functions)
  - `src/features/<feature>/api/` → parse via Zod then mapping
- **Minimum rules**:
  - **Zod mandatory** at the API boundary — especially critical on mobile, where silent runtime errors are hard to debug
  - Type inferred from Zod: `type UserResponseDto = z.infer<typeof UserResponseDtoSchema>`
  - Strict `RequestDto` / `ResponseDto` suffix
  - Zustand store: **UI Models only**
  - Forms: React Hook Form + a Zod resolver; the mapper converts `FormValues → CreateRequestDto`
  - Offline persistence (MMKV, AsyncStorage): serialize **UI Models**, never DTOs (a DTO can change with the backend)
- **When to create a DTO**: every API endpoint, every WebSocket message, every push notification payload.
- **Full detail (versioning, generated OpenAPI, round-trip tests)** → see the `dto-architect` skill.

## Optional input

If invoked from `mobile-agent`, the framework/version/description parameters are already provided — skip Phase 1.

## Phase 1 — Context

Via AskUserQuestion if not provided:

```
React Native Developer — Context
─────────────────────────────────
1. Mode: [ ] --build   [ ] --review
2. Workflow: [ ] Expo (Managed)   [ ] Expo (Bare)   [ ] React Native CLI
3. Navigation: [ ] React Navigation   [ ] Expo Router
4. State management: [ ] Zustand   [ ] Redux Toolkit   [ ] Jotai
5. Screen / feature description:
```

## Phase 2 — Discovery

> ⚠️ Discovery rule: read package.json and app.json/app.config.ts before any generation.

```bash
# Detect Expo or bare
cat package.json | grep -E '"expo"|"react-native"' | head -5
cat app.json 2>/dev/null | head -5
```

Detect:
- React Native version + Expo SDK
- Navigation (react-navigation, expo-router)
- State (zustand, @reduxjs/toolkit, jotai)
- HTTP (axios, native fetch, react-query/TanStack Query)
- Tests (jest, @testing-library/react-native, detox)
- TypeScript config (tsconfig.json, strict mode)

## Phase 3 — File structure

> ⚠️ Structure rule: feature-first, barrel exports forbidden.

```text
src/
├── features/
│   └── [feature]/
│       ├── api/           # Feature's HTTP calls
│       ├── components/    # Isolated visual components
│       ├── hooks/         # Business hooks (useFeature, useFeatureForm)
│       ├── screens/       # Screens (one file = one screen)
│       ├── store/         # Zustand or Redux slice
│       └── types/         # Feature-local types
├── shared/
│   ├── components/        # Global UI components
│   ├── hooks/             # Global utility hooks
│   ├── api/               # HTTP client, interceptors
│   └── types/             # Global types
├── navigation/            # Stack / Tab navigators
└── app.tsx / App.tsx
```

## Phase 4 — Code conventions

> ⚠️ TypeScript rule: strict: true, no any, interfaces for all props.

### Types

```typescript
// Business types
export interface Feature {
  id: string;
  name: string;
  active: boolean;
}

export interface CreateFeatureDto {
  name: string;
}

// Props with explicit types, never any
export interface FeatureCardProps {
  feature: Feature;
  onPress: (id: string) => void;
  testID?: string;
}
```

### HTTP client

```typescript
import axios, { AxiosInstance } from 'axios';

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10_000,
});

apiClient.interceptors.request.use((config) => {
  // Add the auth token if available
  return config;
});

export default apiClient;
```

### API layer

```typescript
import apiClient from '@/shared/api/client';
import type { Feature, CreateFeatureDto } from '../types';

export const featureApi = {
  getAll: async (): Promise<Feature[]> => {
    const { data } = await apiClient.get<Feature[]>('/features');
    return data;
  },

  getById: async (id: string): Promise<Feature> => {
    const { data } = await apiClient.get<Feature>(`/features/${id}`);
    return data;
  },

  create: async (dto: CreateFeatureDto): Promise<Feature> => {
    const { data } = await apiClient.post<Feature>('/features', dto);
    return data;
  },
};
```

### Zustand store

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { featureApi } from '../api/feature.api';
import type { Feature } from '../types';

interface FeatureState {
  features: Feature[];
  loading: boolean;
  error: string | null;
  fetchAll: () => Promise<void>;
  remove: (id: string) => void;
}

export const useFeatureStore = create<FeatureState>()(
  immer((set) => ({
    features: [],
    loading: false,
    error: null,

    fetchAll: async () => {
      set((state) => { state.loading = true; state.error = null; });
      try {
        const features = await featureApi.getAll();
        set((state) => { state.features = features; state.loading = false; });
      } catch (err) {
        set((state) => {
          state.loading = false;
          state.error = err instanceof Error ? err.message : 'Unknown error';
        });
      }
    },

    remove: (id) => {
      set((state) => {
        state.features = state.features.filter((f) => f.id !== id);
      });
    },
  }))
);
```

### Screen

```typescript
import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useFeatureStore } from '../store/feature.store';
import { FeatureCard } from '../components/FeatureCard';

export function FeatureScreen(): JSX.Element {
  const { features, loading, error, fetchAll } = useFeatureStore();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" accessibilityLabel="Loading" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="alert">{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={features}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <FeatureCard
          feature={item}
          onPress={(id) => console.log(id)}
          testID={`feature-card-${item.id}`}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

### Component

```typescript
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { FeatureCardProps } from '../types';

export const FeatureCard = memo(function FeatureCard({
  feature,
  onPress,
  testID,
}: FeatureCardProps): JSX.Element {
  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(feature.id)}
      accessibilityRole="button"
      accessibilityLabel={feature.name}
      testID={testID}
    >
      <Text style={styles.name}>{feature.name}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  name: {
    fontSize: 16,
  },
});
```

### Navigation (React Navigation)

```typescript
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Features: undefined;
  FeatureDetail: { id: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator(): JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Features" component={FeatureScreen} />
        <Stack.Screen name="FeatureDetail" component={FeatureDetailScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## Phase 5 — Tests

> ⚠️ Testing rule: Testing Library for components, a mock store for integration tests.

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { FeatureCard } from '../components/FeatureCard';

const mockFeature = { id: '1', name: 'Feature A', active: true };

describe('FeatureCard', () => {
  it('displays the feature name', () => {
    render(
      <FeatureCard feature={mockFeature} onPress={jest.fn()} testID="feature-card-1" />
    );
    expect(screen.getByText('Feature A')).toBeOnTheScreen();
  });

  it('calls onPress with the id on tap', () => {
    const onPress = jest.fn();
    render(<FeatureCard feature={mockFeature} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Feature A' }));
    expect(onPress).toHaveBeenCalledWith('1');
  });
});
```

```bash
# Run the tests
npx jest

# With coverage
npx jest --coverage

# A specific file
npx jest src/features/feature/components/FeatureCard.test.tsx
```

## Phase 6 — Pre-delivery checklist

- [ ] `npx tsc --noEmit` — zero TypeScript errors
- [ ] `npx eslint src/` — zero warnings
- [ ] `npx jest` — all tests pass
- [ ] `accessibilityLabel` or `accessibilityRole` on every interactive element
- [ ] `memo()` on components within lists
- [ ] `testID` on critical E2E test elements
- [ ] No `any` without a justifying comment

## Conditional persistence

⚠️ Skip if invoked from `mobile-agent` — memory is handled by the agent.

Otherwise, record in memory: RN version, Expo or bare workflow, chosen state manager, navigation pattern.
