#!/bin/sh
# Zagon na Render (brezplačni paket nima ločenih delavcev): migracije, Celery delavec v ozadju
# in API v istem vsebniku. Lokalno (Docker Compose) se ne uporablja.
set -e

# Render poda postgresql://...; aplikacija uporablja gonilnik psycopg 3.
DATABASE_URL=$(echo "$DATABASE_URL" | sed -E 's#^postgres(ql)?://#postgresql+psycopg://#')
export DATABASE_URL

alembic upgrade head

# Brezplačni paket nima lupine: šampione in predmete (Data Dragon) uvozimo ob vsakem zagonu.
# Uvoz je idempotenten; teče v ozadju, da API takoj odpre port.
(python -m app.ddragon || echo "Uvoz Data Dragon ni uspel") &

celery -A app.worker worker --loglevel=info --pool=solo --concurrency=1 &

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8989}" --proxy-headers --forwarded-allow-ips='*'
