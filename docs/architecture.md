# TemariCom architecture

TemariCom uses a **modular monolith** architecture. The application is
organized into well-defined business modules, but the backend is currently
built and deployed as one Go application rather than as separate
microservices.

This approach keeps development and deployment simple while allowing each
domain to maintain its own handlers, services, repositories, models, and
data-transfer objects. Shared infrastructure is kept separate from business
modules so that module boundaries remain clear as the project grows.

The repository contains:

- `backend/` - Go API and backend modules
- `web/` - React and TypeScript frontend
- `docs/` - project documentation

## Backend architecture

The backend uses Go with Fiber. The application entrypoint is under
`backend/cmd/api`, while domain code is kept inside `backend/internal`.
Packages under `internal` are private to the backend application and are not
intended to be imported by external projects.

```text
backend/
├── cmd/
│   └── api/
│       └── main.go
├── config/
├── internal/
│   ├── admin/
│   │   ├── dto/
│   │   ├── handler/
│   │   ├── model/
│   │   ├── repository/
│   │   └── service/
│   ├── auth/
│   ├── chat/
│   ├── chess/
│   ├── delivery/
│   ├── institution/
│   ├── learning/
│   ├── lostfound/
│   ├── marketplace/
│   ├── notification/
│   ├── opportunities/
│   ├── profile/
│   ├── social/
│   ├── tutor/
│   └── user/
│       ├── dto/
│       ├── handler/
│       ├── model/
│       ├── repository/
│       └── service/
├── migrations/
├── pkg/
│   ├── database/
│   ├── email/
│   ├── middleware/
│   ├── storage/
│   ├── utils/
│   └── validator/
├── go.mod
└── go.sum
```

Each domain module follows the same internal layering:

| Directory    | Responsibility                             |
| ------------ | ------------------------------------------ |
| `dto`        | Request and response data-transfer objects |
| `handler`    | HTTP transport and route handlers          |
| `service`    | Business rules and use cases               |
| `repository` | Persistence and database access            |
| `model`      | Domain and persistence models              |

### Backend shared packages

The `pkg` directory contains reusable infrastructure shared by multiple
modules:

- `database` - database connection and persistence helpers
- `email` - email delivery integrations
- `middleware` - HTTP middleware
- `storage` - file and object storage integrations
- `utils` - general-purpose helpers
- `validator` - request and domain validation

Shared packages should not contain business logic that belongs to one
specific domain. That logic should remain inside the relevant `internal`
module.

## Frontend architecture

The frontend uses React, TypeScript, and Vite. Shared application concerns
are stored directly under `web/src`, while domain-specific UI and logic are
organized under `web/src/features`.

```text
web/
├└── assets/
│       └── temaricom-logo.png
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── components/
│   ├── config/
│   ├── context/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   ├── context/
│   │   │   ├── hooks/
│   │   │   ├── screens/
│   │   │   ├── services/
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── chat/
│   │   ├── chess/
│   │   ├── delivery/
│   │   ├── home/
│   │   ├── institution/
│   │   ├── learning/
│   │   ├── lostfound/
│   │   ├── marketplace/
│   │   ├── notification/
│   │   ├── opportunities/
│   │   ├── profiles/
│   │   └── tutor/
│   ├── services/
│   ├── store/
│   ├── theme/
│   ├── types/
│   ├── utils/
│   └── global.css
├── index.html
├── eslint.config.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### Frontend shared directories

- `app` - application entrypoint and root component
- `components` - reusable presentation components
- `config` - frontend configuration
- `context` - shared React context providers
- `services` - shared API and integration services
- `store` - application-wide state management
- `theme` - design tokens and theme configuration
- `types` - shared TypeScript types
- `utils` - reusable frontend helpers

### Frontend feature modules

Each directory under `src/features` represents a business domain. Feature
code should stay close to the domain that owns it. The `auth` module already
shows the intended internal organization:

- `components` - feature-specific reusable UI
- `context` - feature-specific providers
- `hooks` - feature-specific React hooks
- `screens` - feature pages and screens
- `services` - feature API and integration logic
- `types.ts` - feature types
- `index.ts` - feature public exports

## Module boundaries

Modules should communicate through explicit interfaces and public exports
rather than reaching into another module's internal implementation. Shared
code belongs in the appropriate shared package or directory only when it is
truly used by multiple modules.

The backend and frontend use the `@` import alias for frontend imports from
`web/src`. This keeps imports stable when files move within the source tree.
