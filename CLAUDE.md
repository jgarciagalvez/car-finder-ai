- use AGENTS.md instead of CLAUDE.md
- Ignore the Windows Poweshell instructions. You are working on bash and should use bash commands.
- When using relative paths, make sure to us `WorkspaceUtils.findWorkspaceRoot()` so the correct directory is used independently from where the app is run.
- `.env` in project root.
    - Should be used by services and factory, not by consumers
    - Consumers should load environment via `WorkspaceUtils.loadEnvironment()` before accessing service registry. Services deal with .env variables.

- don't add anything in the commits about generated with claude or co-authored with claude