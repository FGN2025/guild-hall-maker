
Problem: your frontend updates are very likely not publishing because the build is failing before deployment completes. The repeated error is not a runtime app issue — it is the build step stopping at:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'rollup' imported from /opt/template-node-modules/vite/dist/node/cli.js
```

What I verified:
- `package.json` uses `vite build` for production builds.
- `vite` is installed, but `rollup` is not explicitly listed in `package.json`.
- Both `bun.lock` and `package-lock.json` exist, which can make dependency resolution less predictable in cloud builds.
- The current tenant billing change is already in code, but if the build never completes, it will not reach the published site.
- The console warning about `Skeleton` refs is unrelated to publishing and does not explain the failed deploy.

Plan:
1. Make the build deterministic by adding `rollup` as an explicit dev dependency in `package.json`.
2. Keep the dependency version aligned with the Vite 5 range already reflected in the lockfile (`rollup` 4.x).
3. Trigger a fresh publish after that dependency change so the frontend bundle can be rebuilt successfully.
4. Verify that the latest tenant settings behavior is now visible in the published app.
5. Optionally clean up package-manager ambiguity afterward if needed.

Technical details:
- Root cause: Vite depends on Rollup, but the build environment is failing to resolve it from the package graph. This is a known class of issue when optional/transitive dependencies are not installed or hoisted as expected.
- Safest fix: explicitly declare Rollup in `devDependencies` rather than relying on transitive installation.
- Likely file to change:
  - `package.json`
- Expected edit:
  ```json
  "devDependencies": {
    ...
    "rollup": "^4.24.0",
    "vite": "^5.4.19"
  }
  ```
- I would not change app code for this issue.
- I would treat `bun.lock` + `package-lock.json` as a secondary concern unless the build still fails after explicitly pinning Rollup.

Expected result:
- Frontend publishes should resume.
- The recent tenant billing visibility update should appear on the live site once the build succeeds.
- Backend-only changes would already deploy automatically, but UI changes require a successful frontend publish/build.

If approved, I’ll implement the dependency fix first, then you can republish and verify the tenant settings page.
