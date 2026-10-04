# Test report

Run on 4 October 2026 with Node.js v22.22.2 (Linux), using `npm test`. Every line below is real output from that run. Nothing here is hand-written.

## Summary

```text
ℹ tests 75
ℹ suites 10
ℹ pass 75
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

## Coverage of the Task-2 checklist

| Check | Result | Covered by |
|-------|--------|-----------|
| Health endpoint | ✓ | Health and routing |
| List endpoint | ✓ | List, pagination, search and filters |
| Pagination (incl. invalid values) | ✓ | List, pagination, search and filters |
| Search | ✓ | List, pagination, search and filters |
| Domain filter | ✓ | List, pagination, search and filters |
| Mode filter | ✓ | List, pagination, search and filters |
| Combined search + filters + pagination | ✓ | List, pagination, search and filters |
| Detail endpoint and 404 | ✓ | Internship detail |
| Create endpoint | ✓ | Create internship |
| Validation (title, domain, mode, location, skills, openings) | ✓ | Create internship |
| Duplicate ID returns 409 | ✓ | Create internship |
| Update endpoint (ID cannot change) | ✓ | Update internship |
| Delete endpoint | ✓ | Delete internship |
| Application submission | ✓ | Applications |
| Invalid email rejection | ✓ | Applications |
| Duplicate application returns 409 | ✓ | Applications |
| Seed records INT-101 to INT-105 preserved exactly | ✓ | Seed data |
| SQL injection attempts are harmless | ✓ | List..., Internship detail |
| Consistent response envelope | ✓ | Response contract |
| Database persistence across a server restart | ✓ | persistence test |

## Full output

```text
▶ Health and routing
  ✔ GET /api/health returns 200 with the success envelope
  ✔ unknown API route returns 404 ROUTE_NOT_FOUND
  ✔ the front end page is served at /
✔ Health and routing
▶ Seed data
  ✔ INT-101 to INT-105 exist with the exact supplied values and array skills
✔ Seed data
▶ List, pagination, search and filters
  ✔ GET /api/internships returns all records with default pagination
  ✔ pagination: page 1 and 2 with limit 2
  ✔ pagination: a page past the end returns an empty list, not an error
  ✔ pagination: invalid page / limit values return 400 VALIDATION_ERROR
  ✔ limit=100 (the maximum) is accepted
  ✔ search matches the title, case-insensitively
  ✔ search matches skills, location and domain
  ✔ search with no match returns an empty list and zero pages
  ✔ search treats % and _ as plain characters, not wildcards
  ✔ search ignores JSON punctuation stored in the skills column
  ✔ domain filter: UI/UX
  ✔ domain filter: multi-word domain and case-insensitive match
  ✔ mode filter: Remote
  ✔ mode filter: Hybrid and On-site; lowercase is accepted
  ✔ mode filter: an unknown mode returns 400
  ✔ search + domain + mode + pagination work together
  ✔ SQL injection attempts in search and domain do not return extra rows or break anything
✔ List, pagination, search and filters
▶ Internship detail
  ✔ GET /api/internships/INT-101 returns the record
  ✔ missing record returns 404 INTERNSHIP_NOT_FOUND
  ✔ an injection-style ID is treated as plain text and returns 404
✔ Internship detail
▶ Create internship
  ✔ valid create returns 201 and the new record, which can then be fetched
  ✔ values are trimmed before saving
  ✔ invalid create (missing id) returns 400 with a "id" field error
  ✔ invalid create (missing title) returns 400 with a "title" field error
  ✔ invalid create (blank title) returns 400 with a "title" field error
  ✔ invalid create (missing domain) returns 400 with a "domain" field error
  ✔ invalid create (missing mode) returns 400 with a "mode" field error
  ✔ invalid create (invalid mode) returns 400 with a "mode" field error
  ✔ invalid create (missing location) returns 400 with a "location" field error
  ✔ invalid create (skills missing) returns 400 with a "skills" field error
  ✔ invalid create (skills not an array) returns 400 with a "skills" field error
  ✔ invalid create (skills empty array) returns 400 with a "skills" field error
  ✔ invalid create (skills containing a blank string) returns 400 with a "skills" field error
  ✔ invalid create (skills containing a number) returns 400 with a "skills" field error
  ✔ invalid create (negative openings) returns 400 with a "openings" field error
  ✔ invalid create (decimal openings) returns 400 with a "openings" field error
  ✔ invalid create (openings as a string) returns 400 with a "openings" field error
  ✔ invalid create (openings missing) returns 400 with a "openings" field error
  ✔ invalid create (id with unsafe characters) returns 400 with a "id" field error
  ✔ several problems are reported together
  ✔ invalid creates did not save anything
  ✔ an empty or non-object body returns 400
  ✔ malformed JSON returns 400 INVALID_JSON without leaking details
  ✔ creating INT-101 again returns 409 DUPLICATE_ID
✔ Create internship
▶ Update internship
  ✔ PUT updates an existing record and returns 200
  ✔ sending the same ID in the body is allowed
  ✔ trying to change the ID through the body returns 400 and changes nothing
  ✔ invalid update data returns 400 and the record is unchanged
  ✔ updating a missing record returns 404
✔ Update internship
▶ Applications
  ✔ valid application returns 201 and does not echo applicant details
  ✔ the application row is stored in the database
  ✔ missing applicant name returns 400
  ✔ blank applicant name returns 400
  ✔ invalid emails return 400
  ✔ missing email returns 400
  ✔ missing internship_id returns 400
  ✔ a non-existing internship returns 404
  ✔ applying twice with the same email returns 409 DUPLICATE_APPLICATION
  ✔ the same email in different letter case is also a duplicate
  ✔ the same email can apply to a different internship
  ✔ a different email can apply to the same internship
  ✔ malformed JSON on /api/applications returns 400 and does not leak the body
✔ Applications
▶ Delete internship
  ✔ an internship that has applications cannot be deleted (409)
  ✔ DELETE removes the test internship and returns 200
  ✔ deleting a missing record returns 404
  ✔ after all the above, the five seed records are still there
✔ Delete internship
▶ Database safety
  ✔ applications table has a UNIQUE rule that the database itself enforces
  ✔ foreign keys are enforced: an application for a missing internship is rejected by SQLite
  ✔ isConstraintError is false for ordinary errors
✔ Database safety
▶ Response contract
  ✔ every success and error response uses the documented envelope
✔ Response contract
✔ data survives a server restart
ℹ tests 75
ℹ suites 10
ℹ pass 75
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 1155.230195
```

## Also checked by hand (not part of `npm test`)

- Started the server and ran every cURL example in `docs/api-examples.md`; the responses matched the documented ones.
- Confirmed the server log contained no applicant name, email, request body or search term after submitting applications and sending malformed JSON.
- Exercised the front-end logic in a simulated browser (jsdom, throwaway script): 23 of 23 checks passed. This is not a real-browser test. See the Accessibility section of the README for the manual keyboard and 360px checks that are still to be done.
