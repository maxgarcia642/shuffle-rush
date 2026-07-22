/**
 * InstantDB config template (Block 7 — optional remote leaderboard).
 *
 * To enable the remote leaderboard:
 *   1. Create an app at https://www.instantdb.com/dash and copy its App ID.
 *   2. Copy this file to `instant_db_config.js` (same directory).
 *   3. Paste your App ID below.
 *
 * `instant_db_config.js` is gitignored — never commit real credentials.
 * WITHOUT this file the game runs exactly as before: the leaderboard is
 * local-only (localStorage) and no network calls are made.
 */
export default {
  appId: 'YOUR-INSTANTDB-APP-ID'
};
