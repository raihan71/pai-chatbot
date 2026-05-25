# TanStack + React + pnpm

A starter project using TanStack libraries with React and pnpm.

## Features

- React application scaffold
- TanStack Query for data fetching and caching
- TanStack Table for building tables (if used)
- pnpm package manager

## Getting Started

### Prerequisites

- Node.js 18+ installed
- pnpm installed globally (`npm install -g pnpm`)

### Install dependencies

```bash
pnpm install
```

### Run locally

```bash
pnpm dev
```

### Build for production

```bash
pnpm build
```

### Preview production build

```bash
pnpm preview
```

## Project Structure

- `src/` - application source files
- `public/` - static assets
- `package.json` - project scripts and dependencies
- `pnpm-lock.yaml` - pnpm lockfile

## Notes

- If using TanStack Query, configure the `QueryClient` and wrap the app with `QueryClientProvider`.
- If using TanStack Table, define column definitions and row data in the table component.
- Adjust scripts and dependencies based on the actual project setup.
