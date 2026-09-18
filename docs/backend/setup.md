# TemariCom Backend Setup

## This document explains how to set up, run, test, and configure the TemariCom backend locally.

## 1. Overview

The TemariCom backend provides the REST API and server-side business logic for the platform.

The backend is currently implemented as a Go Fiber modular monolith.

Main responsibilities include:

- authentication
- authorization
- user management
- profiles
- learning resources
- opportunities
- social features
- chat
- notifications
- marketplace
- delivery
- lost and found
- campus features
- other platform services

The backend communicates with PostgreSQL for persistent data storage.

---

## 2. Technology Stack

| Technology     | Purpose                               |
| -------------- | ------------------------------------- |
| Go             | Backend programming language          |
| Fiber          | HTTP web framework                    |
| PostgreSQL     | Relational database                   |
| pgx / pgxpool  | PostgreSQL driver and connection pool |
| SQL migrations | Database schema management            |
| WebSocket      | Real-time communication               |
| Cloudflare R2  | Object/media storage                  |

| Email provider | Transactional email |

---

## 3. Prerequisites

Install:

- Go
- Git
- PostgreSQL client tools if needed
- Docker (optional)

Verify Go:

```bash
go version
```
