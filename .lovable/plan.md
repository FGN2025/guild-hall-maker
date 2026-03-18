

## Problem Analysis

There are **two separate issues**:

### Issue 1: Build Failure (blocking publishing)
The build system runs `$ vite build`, which resolves to `/opt/template-node-modules/vite/dist/node/cli.js` — a platform-level Vite binary. That binary cannot find `rollup` because rollup is installed in the project's `node_modules`, not in `/opt/template-node-modules/`. Previous attempts to fix this (adding rollup to dependencies, changing scripts to `node ./node_modules/vite/bin/vite.js build`) were either reverted or ineffective because the build system uses its own PATH resolution.

### Issue 2: Production Runtime Error (from old deployed bundle)
The production site at `play.fgn.gg/tournaments` shows `"useSidebar must be used within a SidebarProvider"`. This is from whatever bundle was last successfully deployed before builds started failing.

## Plan

### Step 1: Fix the build resolution
Change the build script to use `./node_modules/.bin/vite build` which is a locally-installed shim that always resolves to the project's Vite. This bypasses the PATH-based resolution that falls back to the template directory.

**`package.json` scripts change:**
```json
"scripts": {
  "dev": "vite",
  "build": "./node_modules/.bin/vite build",
  "build:dev": "./node_modules/.bin/vite build --mode development",
  "preview": "./node_modules/.bin/vite preview"
}
```

### Step 2: If step 1 still fails, escalate
If the build system overrides or ignores the `build` script entirely, this is a platform-level infrastructure issue that cannot be fixed from within the project. In that case, I would recommend contacting Lovable support.

### Step 3: Fix production runtime error (will deploy with successful build)
Investigate the `useSidebar must be used within a SidebarProvider` error — this is likely a component using the shadcn `useSidebar` hook outside of the `SidebarProvider` context. Once the build succeeds, the latest code (which works in development) will deploy and fix this.

**Files to edit:** `package.json` (scripts only)

