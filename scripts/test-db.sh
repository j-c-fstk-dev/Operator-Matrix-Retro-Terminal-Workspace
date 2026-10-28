#!/usr/bin/env bash
# Roda os scripts de supabase/ num Postgres limpo e os testes de segurança de tests/sql/.
# Uso: DATABASE_URL=postgres://postgres@localhost:5432/postgres scripts/test-db.sh
# (o banco precisa estar vazio; no CI é um container novo a cada execução)
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DATABASE_URL:?defina DATABASE_URL}"

run() { psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }

run -f tests/sql/supabase-stub.sql
for f in supabase/schema.sql supabase/storage.sql supabase/waitlist.sql supabase/teams.sql; do
  run -f "$f" >/dev/null
done
# Os scripts precisam poder rodar de novo sem erro.
run -f supabase/schema.sql -f supabase/teams.sql >/dev/null 2>&1 || { echo "rodar os scripts de novo falhou"; run -f supabase/schema.sql -f supabase/teams.sql; }
run -f tests/sql/teams.test.sql
