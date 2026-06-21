### 1. Database changes — ALWAYS create migration files
- Migration files live in `database/` (project root level, not under backend/).
- Naming convention: `migration_NN_description.sql` where NN is the next sequential number.
- Current latest is migration_09_flutterwave.sql, so next is migration_10_*.sql.
- Numbers are zero-padded to 2 digits.
- Update the migration_NN sequence by adding new files; never modify old ones.