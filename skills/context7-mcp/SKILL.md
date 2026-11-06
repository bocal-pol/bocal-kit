---
name: context7-mcp
description: This skill should be used when the user asks about libraries, frameworks, API references, or needs code examples. Activates for setup questions, code generation involving libraries, or mentions of specific frameworks like React, Vue, Next.js, Prisma, Supabase, etc.
model: claude-sonnet-5
user-invocable: true
type: utility
priority: high
scope: cross
dependencies: []
conflicts: []
---

When the user asks about libraries, frameworks, or needs code examples, use Context7 to fetch current documentation instead of relying on training data.

## How to Fetch Documentation

### Step 1: Resolve the Library ID

Call `resolve-library-id` with:

- `libraryName`: The library name extracted from the user's question
- `query`: The user's full question (improves relevance ranking)

### Step 2: Select the Best Match

From the resolution results, choose based on:

- Exact or closest name match to what the user asked for
- Higher benchmark scores indicate better documentation quality
- If the user mentioned a version (e.g., "React 19"), prefer version-specific IDs

### Step 3: Fetch the Documentation

Call `query-docs` with:

- `libraryId`: The selected Context7 library ID (e.g., `/vercel/next.js`)
- `query`: The user's specific question

### Step 4: Use the Documentation

Incorporate the fetched documentation into your response:

- Answer the user's question using current, accurate information
- Include relevant code examples from the docs
- Cite the library version when relevant

## Guidelines

- **Be specific**: Pass the user's full question as the query for better results
- **Version awareness**: When users mention versions ("Next.js 15", "React 19"), use version-specific library IDs if available from the resolution step
- **Prefer official sources**: When multiple matches exist, prefer official/primary packages over community forks

## ⚠️ Fallback — if the Context7 MCP server is unavailable

Fifteen skills declare `context7-mcp` as a dependency. The server isn't guaranteed to be present: it
installs separately (`claude mcp add context7 -- npx -y @upstash/context7-mcp`, see `INSTALL.md`).
In its absence, `resolve-library-id` and `query-docs` fail.

**The fallback is not "answer anyway, silently."** Generating code from potentially stale training
knowledge without saying so is exactly the failure mode this skill exists to prevent. Expected
behavior:

1. **State it explicitly**, once per session:
   `⚠️ Context7 unavailable — the documentation below comes from training knowledge and may be outdated.`
2. **Check the version actually used** in the project (`package.json`, `composer.json`, `*.csproj`,
   `pubspec.yaml`) and stick to it, rather than assuming the latest version.
3. **Prefer the project's existing code** as a style/API reference: a call already written and
   working beats a remembered piece of documentation.
4. **Flag what needs re-checking**: any API signature, config option, or CLI command produced
   without Context7 is annotated `<!-- to verify: documentation not consulted -->` in persisted
   deliverables.
5. **Offer to install it** if the session involves more than one round-trip on a third-party
   library.

The same fallback applies to skills that declare this dependency: `analytics-engineer`,
`angular-developer`, `data-engineer`, `devops`, `dotnet-developer`, `dto-architect`,
`flutter-developer`, `integration-developer`, `kubernetes-engineer`, `laravel-api`,
`laravel-developer`, `qa-automation`, `react-developer`, `react-native-developer`, `refacto`.
