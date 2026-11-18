# @devhub/mern-plugin

This Nx plugin provides:

- a workspace preset in `src/generators/workspace`, used by `create-devhub-workspace`
- an `application` generator for frontend, backend, or full-stack apps

Generate an application in an Nx workspace:

```powershell
pnpm nx g @devhub/mern-plugin:application my-app --type=fullstack
```

The generator creates `apps/my-app-web`, `apps/my-app-api`, or both. It adds
dependencies appropriate to the selected application type. The backend template
includes `.env.example`; copy it to `.env` and set your own MongoDB connection
before starting the API.

Build the plugin with `pnpm nx build @devhub/mern-plugin`.
