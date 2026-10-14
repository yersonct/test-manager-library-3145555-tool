# Demo Data Seeder

Loads test data exclusively through the public Manager Library API. It does not connect to PostgreSQL, write directly to tables, or embed credentials in source code.

## Requirements

- Node.js 20+.
- The API is running, migrated, and has an administrator provisioned.
- `ADMIN_USERNAME` and `ADMIN_PASSWORD` are set to the local administrator credentials.

## Run

From PowerShell:

```powershell
$env:ADMIN_USERNAME = "admin"
$env:ADMIN_PASSWORD = "<local-password>"
$env:API_BASE_URL = "http://localhost:8000/api/v1"
npm run seed
```

The seeder creates five books, three members, and up to three regular loans. It searches for existing demo books and members first, so it can be rerun without duplicating those records. It does not delete or modify existing data.

The current contract cannot create overdue loans: the API sets `due_at` to 14 days after creation and exposes no operation to change it. The seeder does not fake overdue dates or bypass the API with SQL. Enabling overdue-loan demos requires an explicitly approved contract extension or an isolated test mechanism.

Run this seeder only against a development or demo instance. The records are fictional, but the program performs writes through the API.
