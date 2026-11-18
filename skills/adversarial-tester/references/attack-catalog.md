# Attack catalog — the clumsy, twisted or malicious user

Go through it **per field, per endpoint and per journey**. For each line, note: input, expected,
observed. A "it holds" is a result too: record it for coverage. All inputs are harmless by
construction: they test robustness, they exploit nothing (see "Security limit" in the skill).

## 1. Absurd data

| Family | Examples to try |
| --- | --- |
| Empty and blank | empty string, one space, only spaces, tab, line break in a one-line field, `null`, `undefined`, `NaN`, the string `"null"` |
| Length | 1 character, 255, 256, 1,000, 10,000, 1,000,000; a 300-character file name |
| Unicode | emojis (including ZWJ: 👨‍👩‍👧), Arabic/Hebrew (right to left), zero-width characters, combined vs precomposed accents (`é` in 2 forms), homoglyphs (Cyrillic `а`), `İ`/`ß` (case), `\u0000` |
| Syntaxes that trap | `'`, `"`, `\`, `%s`, `%n`, `{{7*7}}`, `${7*7}`, `<b>x</b>`, `<script>`, `' OR 1=1 --`, `../../etc/passwd`, `C:\con`, `NUL`, `;`, `\|`, `$(…)` — to see whether it is **escaped and rendered harmless**, not to exploit |
| Numbers | 0, -1, -0, 0.1+0.2, 1e308, 1e-308, `Infinity`, 2³¹, 2⁶³, 9,007,199,254,740,993, decimal comma or point, thousands separator, `1,5` vs `1.5`, `٣` (Arabic digits) |
| Dates and times | 29 February (non-leap year), 31 April, year 0, 1900, 9999, time zone and daylight saving (the night with no 2:30), midnight, month end, extreme future/past date, ambiguous format `03/04` |
| Files | 0 bytes, huge, extension that lies (`.jpg` that is an `.exe`), double extension, name with spaces/accents/emoji, corrupted file, archive containing an archive |
| Identifiers | e-mail with `+`, very long, no domain, two `@`, capitals; phone with letters, `+` in the middle, 30 digits; wrong IBAN/national number of valid shape |
| Copy-paste | text with non-breaking spaces, typographic quotes, Windows/Unix line breaks, rich formatting |

## 2. Silly behavior (no bad intent)

| Situation | To try |
| --- | --- |
| Clicks | double click, triple click, frantic click on "Pay" or "Send", click while loading |
| Navigation | Back button in the middle of a journey, Refresh after a submit, Back after logout, Forward after Back |
| Tabs | same form open in two tabs, two sessions of the same account in parallel, a tab left open overnight |
| Sessions | let it expire then submit, log out in one tab and act in the other, cookie removed mid-way |
| Network | cut in the middle of a send, very slow, request that times out then is retried |
| Input | leave everything empty and submit, cancel half-way, put the first name in the last name, password in the e-mail field, all caps |
| Display | tiny window, 500% zoom, enlarged text, forced dark mode, JavaScript disabled, screen reader, keyboard only |
| Usual silliness | submit twice, create the same item 5 times, delete then undo then delete again, reopen an expired link from an e-mail |

## 3. Bypasses (the inventive one)

| Idea | To try |
| --- | --- |
| Skip steps | open the URL of step 3 directly without going through 1 and 2; replay the final step; go back to a finished step |
| Point at something else | change the identifier in the URL or body (`id=` of another user) — **observe** whether access is refused, without reading real data |
| Tamper with values | negative price, quantity 0, -1, 0.5, 1e9; 100% discount; reused coupon; total modified client-side |
| Extra fields | add `role`, `is_admin`, `price`, `user_id` to a request body (mass assignment) |
| Bypass the client | disable browser validation, re-enable a `disabled` button, call the API directly without the interface |
| Methods and shapes | `GET` instead of `POST`, unexpected `DELETE`/`PUT`, malformed JSON, array instead of object, text instead of number, duplicate key, huge payload, odd headers |
| Replay and parallelize | the same request twice, ten times **in parallel** (race: double spend, double creation); reused idempotency key |
| Impossible states | edit what has just been deleted; two people editing the same resource; cancel an order already shipped |
| Pagination and sort | `page=-1`, `page=99999999`, `limit=0`, `limit=1000000`, sort on a column that does not exist, empty filter, search `%` or `*` |

## 4. Weird ideas (diverting the use)

- Use a function **backwards or against its purpose**: invite yourself, send yourself a message in a
  loop, remove your own rights, **delete the last administrator**.
- **Self-reference and cycles**: an item that is its own parent, a category inside its own
  sub-category, a folder moved into its own sub-folder.
- **Volume**: create 1,000 items, a one-character name, a one-million-character description, 500
  attachments — within the limits of the "Ceilings" in the skill.
- **Reserved or tricky names**: `admin`, `root`, `null`, `undefined`, `con`, `aux`, `test`, duplicates
  that differ only by case or accents, a name identical to a route (`/api`).
- **Round trip**: export then re-import; re-import twice; import a modified export.
- **Delete what is in use**: an item referenced elsewhere, a non-empty category, an account with
  orders in progress — check the message ("blast radius" rule).
- **Reverse order**: pay before filling the cart, validate before entering, log out during a send.

## 5. What we observe (verdict grid)

| Observation | Indicative severity |
| --- | --- |
| 500 error, crash, blank page | High |
| Corrupted data, duplicate, wrong amount, inconsistent state | Critical |
| Business rule bypassed (skipped step, negative price accepted, right not checked) | Critical |
| Trace, path, SQL query or secret visible in the response | High |
| Raw, vague error message or with no possible action (violates the 3-elements rule) | Medium |
| Accepted although invalid, or refused although valid (accent, `+` in the e-mail) | Medium |
| Abnormal slowness, blocked interface | Medium |
| Display defect, cut text, overlap | Low |
| Holds correctly | Record (coverage) |
