## Directives

- **NEVER expose personal data** in code, comments, examples, commit messages, documentation, or any file that may be committed to the repository. This includes:
  - IP addresses, hostnames, domain names of personal infrastructure
  - API keys, tokens, passwords, credentials
  - Asset IDs, user IDs, or any identifiers from the live Immich instance
  - GPS coordinates of real personal photos
  - Filenames or paths that reveal personal information
- All configuration (URLs, API keys, DB credentials) **must** come from yaml configs, never hardcoded.
- Use generic placeholders in examples
- Store deployment-specific details in Claude memory (outside repo scope), not in project files.
- **Read `docs/` before planning** — always consult existing research, findings, and design docs before proposing changes or starting new work. The docs contain hard-won knowledge about API quirks, country-specific parsing rules, and known limitations.
- **Update `docs/` before committing** — when implementation reveals new findings, edge cases, or changes to architecture/decisions, update the relevant docs first. Docs must stay in sync with the code. If a doc doesn't exist for a new area, create one.