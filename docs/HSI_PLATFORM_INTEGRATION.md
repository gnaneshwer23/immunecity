# HSI platform connection

This checkout reuses the existing HSI Discovery bridge. HSI links from `/for-isi` to this app's `/hsi/discovery` when `VITE_ISI_APP_URL` is configured. `/hsi-consume` remains the diagnostic view. Both loaders now consume validated bundled JSON, so SSR needs neither a self-request to a hard-coded local port nor access to a private GitHub URL.

Refresh from the sibling checkout with:

```bash
HSI_CORE_PATH=/workspace/hsi-core bun run hsi:sync-export
bun test src/test/hsi-phase0.test.ts src/test/hsi-discovery-consume.test.ts src/test/hsi-discovery-loop.test.ts scripts/hsi-bundled-discovery.test.ts src/test/hsi-gate-c-queue.test.ts src/test/hsi-gate-c-curator-status.test.ts
bun run build
```

The sync script generates in an isolated temporary source copy before updating reviewed snapshot files here. The current snapshot restores HSI's hypothetical fixture: `lockedPilot=false`, `legalBinding=false`, `partnerSignedProduction=false`. A fixture `partnerSigned=true` must not be described as a commercial agreement. The old vendored Apolo production-lock claim is no longer current.

40 targeted tests and the client/server production build pass. Full TypeScript checking has 136 pre-existing diagnostics, confirmed against a clean archive of the original commit; this integration does not claim that check passes. HSI-specific mobile table overflow is corrected. Database-backed review writes were not tested; all existing sign-in, role checks and human review gates remain.

The frozen lock's registry mirror is blocked in this cloud instance. Dependencies are installed through a disposable lock copy resolving identical integrity-pinned public packages at registry.npmjs.org. The repository lockfile and package manifest are unchanged. The tested helper is `/workspace/install-immunecity.sh`, also captured in the cloud environment configuration draft.

See `hsi-core/docs/IMMUNECITY_PLATFORM_INTEGRATION.md` for the complete local startup, architecture and release notes. Do not merge HSI/ISI/Aksh databases, send patient records to HSI or treat a source locator as exact claim verification. No deployment or publication has occurred.
