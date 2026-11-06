# Supermarket Simulator

PHP + jQuery supermarket simulator.

## Structure

```
supermarket-simulator/
├── public/          # Web root (index.php, API endpoints, assets)
│   ├── api/
│   └── assets/
│       ├── css/
│       ├── js/
│       └── img/
├── src/             # Application code
│   ├── Config/
│   ├── Repositories/
│   └── Services/
├── database/
├── tests/
└── README.md
```

## Configuration

Copy `.env.example` to `.env` and fill in your database credentials.
`.env` is git-ignored — never commit it. In production, set the same
variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`) as
environment variables on the host.
