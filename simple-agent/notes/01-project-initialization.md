# Step 1: Project Initialization

This step covers initializing a new Cloudflare Worker project using Wrangler.

## 1.1 Prerequisites

- Node.js and npm (or yarn/pnpm) installed.
- Cloudflare account.

## 1.2 Initialize the Project

Open your terminal in the directory where you want to create the project folder. Run the following command:

```bash
# Replace 'simple-agent' if you prefer a different project name
npx wrangler@latest init simple-agent --yes
```

**Explanation:**

- `npx wrangler@latest init simple-agent`: Executes the latest version of Wrangler's initialization command to create a new project named `simple-agent`.
- `--yes`: Skips interactive prompts and uses default settings (TypeScript template, installs dependencies).

**Expected Output:**

Wrangler will create a `simple-agent` directory with the following structure:

```
simple-agent/
├── node_modules/
├── public/
│   └── index.html  # Default static file
├── src/
│   └── index.ts    # Default worker code ("Hello World")
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
└── wrangler.jsonc    # Worker configuration file
```

The command output will confirm successful creation and dependency installation.

## 1.3 Verify Initial Setup

Navigate into the project directory:

```bash
cd simple-agent
```

You can explore the generated files:

- `wrangler.jsonc`: Contains core configuration like the worker name (`main` entry point is `src/index.ts` by default).
- `src/index.ts`: Holds the basic "Hello World" TypeScript code for the worker.
- `package.json`: Lists dependencies (`wrangler`, `@cloudflare/workers-types`) and basic scripts (`start`, `deploy`).

## 1.4 Configure Wrangler (Initial)

Open `wrangler.jsonc`. For now, we just need to ensure the basic structure is correct. The `main` property should point to your entry file:

```jsonc
{
  "name": "simple-agent",
  "main": "src/index.ts",
  "compatibility_date": "YYYY-MM-DD", // Should be a recent date
  // ... other potential default settings ...
}
```

*(Note: We will modify this file significantly in later steps to add bindings for AI, Assets, KV, etc.)*

**Next Step:** [Step 2: Setting Up Static Assets](./02-static-assets.md) 