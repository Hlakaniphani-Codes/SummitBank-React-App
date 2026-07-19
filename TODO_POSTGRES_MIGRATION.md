# PostgreSQL migration TODO

- [ ] Update backend dependencies: replace `mysql2` with `pg`
- [ ] Update DB connection: `backend/config/db.js` to use `pg.Pool`
- [ ] Add Postgres store (rename/refactor): `backend/utils/mysqlStore.js` → `backend/utils/postgresStore.js`
- [ ] Update controllers to use the new store file (or update exports/imports)
- [ ] Rewrite schema files for Postgres:
  - [ ] `backend/schema/SummitDB.sql`
  - [ ] `backend/schema/0001_add_bank_features.sql`
- [ ] Update setup docs: `backend/README_BACKEND_SETUP.md` and/or seed instructions
- [ ] Run backend start + smoke test endpoint `/api/test`
- [ ] Run a basic auth flow to validate DB writes (register/login)
- [ ] Verify key endpoints: dashboard, transactions, cards, beneficiaries/payments/bills, notifications

