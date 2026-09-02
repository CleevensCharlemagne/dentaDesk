---
name: Clerk and workspace React peer range
description: Why Clerk packages may report a React peer warning in this workspace
---

The workspace intentionally pins React 19.1.0 for Expo compatibility, while current Clerk packages advertise a peer range that skips that exact patch release. The web app still typechecks, builds, and runs correctly with this combination.

**Why:** Changing the shared React catalog to silence a peer warning could break the mobile workspace, while the Clerk integration is runtime-compatible in the verified web and API builds.

**How to apply:** Treat this specific Clerk/React peer warning as an intentional workspace constraint unless a future shared React upgrade is coordinated across all artifacts.