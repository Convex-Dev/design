# Build Instructions

This project uses [pnpm](https://pnpm.io/) as the package manager. The project is configured to automatically use the correct version of pnpm via Corepack.

## Prerequisites

- Node.js 24 or higher
- pnpm (installed automatically via Corepack if `packageManager` is set in `package.json`)

## Installation

Install dependencies:

```bash
pnpm install
```

## Development Mode

Start the development server with hot reload:

```bash
pnpm start
```

The site will be available at `http://localhost:3000` by default.

## Build

Build the site for production:

```bash
pnpm build
```

The built site will be in the `build/` directory.

## Serve Production Build

To test the production build locally:

```bash
pnpm serve
```

This serves the `build/` directory locally.

## Other Commands

- `pnpm typecheck` - Run TypeScript type checking
- `pnpm clear` - Clear Docusaurus cache

