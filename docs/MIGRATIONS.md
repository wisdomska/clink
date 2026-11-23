# Migrations and how to undo them

Migrations live in `supabase/migrations` and are applied to preview, then
production, before the code that needs them ships. From 22 November 2026 on,
every migration has an undo script in `supabase/rollbacks/<same name>.down.sql`
(a unit test, `tests/unit/rollbacks.test.ts`, fails without one).

Each undo script starts with a **Data:** line saying what undoing it loses.
Read it before running one. "none" means the migration only added a function.

## Running an undo

1. Undo the code first (redeploy the previous release in Vercel), so nothing
   calls what you're about to remove.
2. Run the script on preview, check the app, then on production:
   `supabase db execute --file supabase/rollbacks/<name>.down.sql` (or paste it
   into the SQL editor).
3. Delete the migration's row so it can be applied again later:
   `delete from supabase_migrations.schema_migrations where version = '<version>';`

Undo newest first. The scripts are checked by running them all, newest first,
inside a transaction that is then rolled back.

## Data notes, 22 and 23 November 2026

| Migration          | Undoing it loses                                        |
| ------------------ | ------------------------------------------------------- |
| page_timing_detail | The slow-load samples and four-part split (totals stay) |
| signup_funnel      | Nothing                                                 |
| invite_reminder    | Which codes were reminded                               |
| board_games        | Every Oware, Four Up and Draughts game. Export first    |
| game_nudges        | Past nudges                                             |
| game_record        | Nothing                                                 |
| streak_freeze      | The freezes: streaks they kept may drop back            |
| ritual_streak      | Nothing                                                 |
