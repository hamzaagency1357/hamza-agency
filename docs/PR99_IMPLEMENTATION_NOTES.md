# PR #99 Implementation Notes

- Supabase development branching was not used because it has an hourly cost for this project and the project policy forbids billing and trials.
- The migration safety snapshot was created inside the target project before the operations migration.
- No Service Role key was requested, displayed, or added to browser code.
- No social URLs were invented; existing social settings remain empty.
- Existing legacy columns and administration routes are retained for backward compatibility.
- Public design and locale routing from PR #98 are unchanged.
- PR #100, White Label expansion, Multi-Tenant, billing, subscriptions, and commercial KPI work are outside this branch and were not started.
