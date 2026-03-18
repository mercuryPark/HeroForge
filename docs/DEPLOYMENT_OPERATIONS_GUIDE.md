# HeroForge Deployment & Operations Guide

## 1. Deployment Strategy

### Branch Strategy

- `main`: production
- `develop`: integration
- `codex/*`: feature branches

### CI (GitHub Actions)

Pipeline:
1. install (`npm ci`)
2. lint (`npm run lint`)
3. test (`npm run test`)
4. build (`npm run build`)

If any step fails, block merge.

### Vercel

- Connect GitHub repo
- Production: `main` push
- Preview: PR open/update
- Build command: `npm run build`
- Output dir: `dist`

## 2. Runtime Configuration

Set these env vars when backend is introduced:

- `VITE_API_BASE_URL`
- `VITE_BUILD_SHA`
- `VITE_ENV`

Current MVP does not require server env vars.

## 3. Mobile Strategy

### Stage A: PWA First

- Add web manifest + service worker
- Cache shell files only
- Do not cache dynamic balance json aggressively

### Stage B: Capacitor (if needed)

Use only when one of these is required:
- App Store / Play Store distribution
- Push notifications
- Native-only APIs

## 4. Operations Checklist

Before release:
1. Verify save/load compatibility from previous version
2. Verify AFK max cap works (8h)
3. Run 1h simulation for each class and compare growth gap
4. Test mobile viewport (360x800 and 390x844)
5. Confirm Vercel preview smoke test

After release:
1. Monitor JS errors (Sentry or LogRocket)
2. Track key metrics: retention proxy(session return), avg stage, gold/min
3. Rollback quickly using previous Vercel deployment if blocking bug occurs

## 5. Performance Guardrails

- Keep battle logic fixed tick (200ms)
- Keep render loop independent from battle calculations
- Avoid creating large objects per tick
- Keep selector-based UI subscriptions to reduce rerender

## 6. Balance Testing Guideline

Use deterministic seed simulation to compare classes.

Targets:
- `gold/min` variance: within +-10%
- `exp/min` variance: within +-10%
- `stage reach at 30m`: within +-2 stages

When out of range, adjust in this order:
1. class growth coefficients
2. skill cooldown/multiplier
3. drop and enhance probabilities

## 7. Save Data Evolution Rule

- Always store `schemaVersion`
- New version must include migration function `vN -> vN+1`
- Never remove old keys without migration
- Add compatibility test for old save fixtures

Current implementation:
- active save key: `heroforge.save.v2`
- legacy read support: `heroforge.save.v1`
- migration path: `v1 -> v2`
- `v2` guarantees these fields exist: `profile`, `skillLevels`, `companions`, `dungeons`, `dailyReward`, `progression`, `questClaims`, `achievementClaims`

Release rule:
1. Add new schema version constant
2. Keep previous save key readable
3. Migrate old payload to latest shape before store load
4. Re-save in latest key after successful migration
5. Add test coverage for migration defaults
