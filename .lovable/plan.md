
Problem

The issue is not the Publish button itself. The app is still showing Update because the latest frontend bundle is not reaching production. The publish step is failing before deployment completes.

What I verified

- `package.json` already includes `rollup`.
- `bun.lock` also includes `rollup`.
- `package-lock.json` is out of sync at the root package level and does not list `rollup` there.
- The build error is still coming from:
  ```text
  /opt/template-node-modules/vite/dist/node/cli.js
  ```
  which means the build is invoking a template/global Vite binary, not a project-local one.

Why this matters

Adding `rollup` to the project was not enough because the failing Vite process is resolving dependencies from `/opt/template-node-modules/...`, not from the project install. That is why publish keeps failing and why the UI still shows Update.

Plan

1. Make the build scripts use the project-local Vite binary explicitly
   - Update `package.json` scripts so build commands run local Vite directly instead of `vite build`.
   - Example approach:
     ```json
     "build": "node ./node_modules/vite/bin/vite.js build"
     ```
   - Do the same for `build:dev` and `preview` so all environments use the same resolution path.

2. Normalize package manager state
   - Choose one lockfile strategy and remove the mismatch.
   - Most likely fix:
     - keep `package.json` with `rollup`
     - regenerate or align `package-lock.json` to match
     - avoid having Bun/NPM lockfiles disagree
   - This prevents installs from drifting between environments.

3. Republish after dependency resolution is deterministic
   - Once Vite resolves from local `node_modules`, `rollup` should be found correctly.
   - The frontend build should then complete and publish the pending UI changes.

4. Verify the actual publish result
   - Confirm the latest tenant settings change appears on the live site.
   - Confirm the publish panel no longer behaves like there are unapplied frontend changes.

Files to update

- `package.json`
- `package-lock.json` and/or `bun.lock` (to make dependency resolution consistent)

Expected result

- Frontend publishes complete successfully.
- The live site reflects the latest code changes.
- The Update state stops persisting because there are no longer failed unpublished changes blocking deployment.

Technical note

The key clue is the path in the error:
```text
Cannot find package 'rollup' imported from /opt/template-node-modules/vite/dist/node/cli.js
```
That strongly suggests this is a tool-resolution problem, not an app-code problem. The next fix should target how the build command resolves Vite, not just whether `rollup` exists in `package.json`.
