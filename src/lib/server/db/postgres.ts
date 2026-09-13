import postgres from 'postgres';

export const sql = postgres(process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/hello_world');
let ready: Promise<void> | undefined;

export function initDb() {
  ready ??= (async () => {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    await sql`CREATE TABLE IF NOT EXISTS app_user (id uuid PRIMARY KEY, username text UNIQUE NOT NULL, display_name text NOT NULL, password_hash text NOT NULL, role text NOT NULL DEFAULT 'MEMBER', color_code text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`ALTER TABLE app_user ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ACTIVE'`;
    await sql`CREATE TABLE IF NOT EXISTS note (id uuid PRIMARY KEY, title text NOT NULL, content text NOT NULL DEFAULT '', version integer NOT NULL DEFAULT 1, owner_id uuid NOT NULL REFERENCES app_user(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz, deleted_by uuid)`;
    await sql`ALTER TABLE note ADD COLUMN IF NOT EXISTS summary text`;
    await sql`ALTER TABLE note ADD COLUMN IF NOT EXISTS summary_updated_at timestamptz`;
    await sql`ALTER TABLE note ADD COLUMN IF NOT EXISTS summary_source_version integer`;
    await sql`ALTER TABLE note ADD COLUMN IF NOT EXISTS summary_status text NOT NULL DEFAULT 'STALE'`;
    await sql`CREATE TABLE IF NOT EXISTS note_permission (note_id uuid REFERENCES note(id) ON DELETE CASCADE, user_id uuid REFERENCES app_user(id) ON DELETE CASCADE, permission text NOT NULL, PRIMARY KEY (note_id, user_id))`;
    await sql`CREATE TABLE IF NOT EXISTS note_revision (id uuid PRIMARY KEY, note_id uuid REFERENCES note(id) ON DELETE CASCADE, version integer NOT NULL, snapshot text NOT NULL, created_by uuid REFERENCES app_user(id), created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS audit_log (id uuid PRIMARY KEY, note_id uuid REFERENCES note(id) ON DELETE SET NULL, user_id uuid REFERENCES app_user(id), action text NOT NULL, block_id text, diff_payload jsonb, search_text text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', search_text)) STORED`;
    await sql`CREATE INDEX IF NOT EXISTS audit_log_search_vector_idx ON audit_log USING GIN (search_vector)`;
    await sql`CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit_log is append-only'; END; $$`;
    await sql`DROP TRIGGER IF EXISTS audit_log_append_only ON audit_log`;
    await sql`CREATE TRIGGER audit_log_append_only BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation()`;
    await sql`CREATE TABLE IF NOT EXISTS note_chunk (id uuid PRIMARY KEY, note_id uuid REFERENCES note(id) ON DELETE CASCADE, chunk_index integer NOT NULL, chunk_text text NOT NULL, content_hash text NOT NULL, last_updated_by uuid REFERENCES app_user(id), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(note_id, chunk_index))`;
    await sql`CREATE TABLE IF NOT EXISTS note_embedding (id uuid PRIMARY KEY, chunk_id uuid UNIQUE REFERENCES note_chunk(id) ON DELETE CASCADE, embedding text, embedding_model text NOT NULL DEFAULT 'lexical-v1', embedding_version text NOT NULL DEFAULT '1', updated_at timestamptz NOT NULL DEFAULT now())`;
    await sql`ALTER TABLE note_embedding ADD COLUMN IF NOT EXISTS embedding_vector vector(1536)`;
    await sql`CREATE TABLE IF NOT EXISTS note_block (id text PRIMARY KEY, note_id uuid REFERENCES note(id) ON DELETE CASCADE, block_index integer NOT NULL, block_type text NOT NULL, block_text text NOT NULL, created_by uuid REFERENCES app_user(id), last_edited_by uuid REFERENCES app_user(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS note_presence (note_id uuid REFERENCES note(id) ON DELETE CASCADE, user_id uuid REFERENCES app_user(id) ON DELETE CASCADE, state text NOT NULL DEFAULT 'VIEWING', last_seen_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(note_id,user_id))`;
    await sql`CREATE TABLE IF NOT EXISTS realtime_ticket (token text PRIMARY KEY, user_id uuid REFERENCES app_user(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS ai_call (id uuid PRIMARY KEY, user_id uuid REFERENCES app_user(id), feature text NOT NULL, model text, outcome text NOT NULL, input_tokens integer, output_tokens integer, latency_ms integer, created_at timestamptz NOT NULL DEFAULT now())`;
    await sql`CREATE TABLE IF NOT EXISTS session (token text PRIMARY KEY, user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL)`;
  })();
  return ready;
}
