SimpleFrontend - Architecture Overview

This file documents the initial modular refactor:

- `src/components/ui/` - small, reusable presentational components (Button, Input, Modal, Card, Badge, Spinner)
- `src/components/layout/` - layout wrappers (AppLayout, DashboardLayout)
- `src/domains/` - domain-specific components (e.g., `match`)
- `src/hooks/` - reusable hooks (e.g., `useDebounce`)
- `src/utils/` - small utility functions

Refactor notes:

- No routes, API contracts, or business logic were changed.
- This is an incremental, non-destructive refactor to introduce clear component boundaries.
- Next steps: extract and replace large page components to use these primitives, migrate repeated UI, and consolidate domain components.
