# DevHub workspace generator

This package contains the CLI wrapper that creates an Nx workspace using the
workspace preset from `@devhub/mern-plugin`.

```powershell
pnpm create devhub-workspace my-workspace
```

The created workspace includes the `@devhub/mern-plugin` generator. Generate
only the application parts you need:

```powershell
pnpm nx g @devhub/mern-plugin:application my-app --type=frontend
pnpm nx g @devhub/mern-plugin:application my-api --type=backend
pnpm nx g @devhub/mern-plugin:application my-product --type=fullstack
```
