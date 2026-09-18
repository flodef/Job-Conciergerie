# Agent Rules

## Explicit-request-only actions

Like commits and pushes, actions with side effects are only made on explicit user request.

## NEVER edit changelogs

**NEVER edit `public/changelog/employee.md` or `public/changelog/conciergerie.md`** —
not proactively, not during releases, not even if asked to add an entry. The user
maintains these files personally. If a change seems to need a changelog note,
mention it in the response and let the user write it themselves.
