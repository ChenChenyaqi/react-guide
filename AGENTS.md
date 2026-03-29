# Agents Configuration for React Guide

## Project Overview

This is a React 19 + TypeScript + Vite demo project demonstrating core React concepts for developers transitioning from Vue.

## Commands

### Development
- `cd react-demo && pnpm dev` - Start development server with HMR
- `cd react-demo && pnpm build` - Build production bundle (tsc -b && vite build)
- `cd react-demo && pnpm preview` - Preview production build

### Quality
- `cd react-demo && pnpm lint` - Run ESLint to check code quality
- `cd react-demo && pnpm build` - Type checking via TypeScript compiler

### Testing
No test framework is currently configured. Install Vitest or Jest before adding tests.

## Code Style Guidelines

### TypeScript & Types
- **Strict mode enabled**: All files must compile with `strict: true`
- **Explicit types**: Always annotate function parameters and return types
- **Interfaces**: Use `interface` for object shapes, `type` for unions/primitives
- **No unused locals/params**: TypeScript will error on unused variables
- **Module syntax**: ES modules with `.js` extension in imports/exports (use `.ts`/`.tsx` for TypeScript files)

### Formatting & Style
- **Indentation**: 2 spaces (standard for React/Vite projects)
- **Quotes**: Double quotes preferred (based on existing codebase)
- **Semicolons**: Required (standard TypeScript/JavaScript style)
- **Trailing commas**: Enabled for multi-line arrays/objects
- **No trailing whitespace**

### Imports
- **Order**: React imports → external libraries → internal modules → relative imports
- **Type imports**: Use `import type { T }` when only importing types
- **Absolute paths**: Use relative imports (`./Component.tsx`) - no path aliases configured
- **Extensions**: Include `.tsx` for React components, `.ts` for utility files

### Component Patterns
- **Functional components only**: No class components (React 19 uses hooks exclusively)
- **PascalCase**: Component names always PascalCase (e.g., `UserProfile`, `App`)
- **Props interface**: Define interface before component, destructure props
- **Hooks**: Use at top level, never in loops/conditions
- **JSX**: Use `<>...</>` fragments when multiple elements

```tsx
import { useState, useEffect } from "react";

interface ButtonProps {
  title: string;
  count: number;
  onPress?: () => void;
}

function Button({ title, count, onPress }: ButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // effect logic
  }, [count]);

  return (
    <button onClick={onPress} disabled={isLoading}>
      {title}: {count}
    </button>
  );
}

export default Button;
```

### Naming Conventions
- **Components**: PascalCase (`UserProfile`, `App`)
- **Hooks**: camelCase with `use` prefix (`useUserProfile`, `useState`)
- **Functions/Variables**: camelCase (`getUserData`, `isLoading`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_URL`, `MAX_ITEMS`)
- **Files**: PascalCase for components (`UserProfile.tsx`), camelCase for utilities (`utils.ts`, `api.ts`)

### State Management
- **useState**: For local component state
- **useEffect**: For side effects (API calls, subscriptions, timers)
- **useMemo**: For expensive computations (memoize based on dependencies)
- **useCallback**: For function callbacks passed to child components
- **Context API**: For global/shared state across component tree

### Error Handling
- **Try/catch**: Wrap async operations in try/catch blocks
- **Error boundaries**: Consider React Error Boundaries for handling render errors
- **Type guards**: Use TypeScript type guards for runtime type checking

### Performance
- **Avoid unnecessary re-renders**: Use `useMemo`, `useCallback` appropriately
- **Keys in lists**: Always provide stable `key` props when rendering lists (use IDs, not indices)
- **Cleanup effects**: Return cleanup functions from `useEffect` to prevent memory leaks

### File Organization
- **Components**: `react-demo/src/components/` - Reusable UI components
- **Pages**: `react-demo/src/pages/` - Page-level components
- **Hooks**: `react-demo/src/hooks/` - Custom hooks
- **Types**: `react-demo/src/types/` - Shared TypeScript types
- **Utils**: `react-demo/src/utils/` - Utility functions
- **Services**: `react-demo/src/services/` - API and external service calls

### ESLint Rules
The project uses:
- `js.configs.recommended` - JavaScript best practices
- `tseslint.configs.recommended` - TypeScript specific rules
- `reactHooks.configs.flat.recommended` - React Hooks rules of hooks
- `reactRefresh.configs.vite` - Fast refresh for HMR

Common ESLint errors to avoid:
- Unused variables/imports
- Missing dependencies in useEffect
- Breaking rules of hooks
- React hydration mismatches

## Important Notes

- This is a learning project demonstrating React concepts
- React 19 uses the new JSX transform (no `import React from "react"` needed)
- Vite provides fast HMR and build tooling
- No production app features (no routing, no state management library configured yet)
- When adding tests, consider Vitest for Jest-like API with Vite integration
