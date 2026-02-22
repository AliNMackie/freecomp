-- competitions table
-- Idempotent: safe to run on every deploy.

CREATE TABLE IF NOT EXISTS competitions (
  id                  UUID          PRIMARY KEY,
  source_url          TEXT          NOT NULL,
  source_site         TEXT          NOT NULL,
  title               TEXT          NOT NULL,
  prize_summary       TEXT,
  prize_value_estimate NUMERIC,
  closes_at           TIMESTAMPTZ,
  is_free             BOOLEAN       NOT NULL DEFAULT FALSE,
  has_skill_question  BOOLEAN       NOT NULL DEFAULT FALSE,
  entry_time_estimate TEXT,
  hype_score          NUMERIC       NOT NULL DEFAULT 5,
  curated_summary     TEXT          NOT NULL,
  discovered_at       TIMESTAMPTZ   NOT NULL,
  verified_at         TIMESTAMPTZ
);

-- Indexes for the most common query patterns.
CREATE INDEX IF NOT EXISTS competitions_closes_at_idx  ON competitions (closes_at NULLS LAST);
CREATE INDEX IF NOT EXISTS competitions_is_free_idx    ON competitions (is_free);
CREATE INDEX IF NOT EXISTS competitions_hype_score_idx ON competitions (hype_score DESC);
CREATE INDEX IF NOT EXISTS competitions_source_url_idx ON competitions (source_url);

-- ── Review workflow columns (added after initial schema) ──────────────────────
-- ALTER TABLE is used so this file remains safe to re-run against existing DBs.
ALTER TABLE competitions
  ADD COLUMN IF NOT EXISTS manual_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flagged         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flag_reason     TEXT;

CREATE INDEX IF NOT EXISTS competitions_review_idx
  ON competitions (is_free, hype_score DESC, verified_at DESC)
  WHERE manual_verified = FALSE AND flagged = FALSE;
