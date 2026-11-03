# Internal research access

Public landing, Explore, Platform and Research pages now lead to the existing
graph, Atlas, evidence and Ask experience. The test programme, fictional case
records, melanoma demo, investigation workbench and manual draft brief are not
mounted on public Research. Old hash links do not bypass that separation.

The unlisted `/internal-research` route uses a server function protected by
`requireNeonAuth`, then `assertAdministrator(context.userId)`. Authentication or
role lookup failure denies access. Signup/member/reviewer access alone is not
enough. No client query parameter or browser role flag grants permission.
The tools are lazy-loaded only after the guarded server request succeeds.
Programme data returned by that request initialise the private case workspace.

Use ISI's existing Neon Auth configuration and its own database. Provision the
stored `admin` role through the established administrator process; never grant
it on signup. HSI database credentials cannot be reused. No new migration or
database write is performed by this change.

The route is marked noindex and omitted from public navigation. Fixture code
remains in the repository; these are fictional test assets, not confidential
patient data. Access control protects the workflow and server request, not the
secrecy of the fixture source code. Local drafts, simulated criteria and analyst
edits still do not constitute clinical operations or scientific approval.

`e2e/public-research-boundary.spec.ts` checks public link/content removal and
anonymous denial even with an `admin=true` query parameter. The retained
programme/project browser suites now require `E2E_ADMIN_EMAIL` and
`E2E_ADMIN_PASSWORD` for a genuinely provisioned administrator and working ISI
Auth/database. Without those they report skipped, never passed. Authorized
workflow checks must run in that configured environment before claiming full
authentication integration coverage.
