Internship Board REST API

A small, beginner-friendly REST API for an internship board, with a plain HTML/CSS/JS front end. It was built for the EdVyro Full Stack Development - Task 2: REST API and Persistent Data assessment.

People can browse internships, search them, filter by domain and work mode, open the details of one internship and submit an application. Everything is stored in a SQLite database file, so data is still there after the server restarts.

Features

REST API with predictable { status, data, pagination } responses

CRUD operations for internships (create, read, update, delete)

SQLite persistence (a database file, not an in-memory array)

Pagination (page, limit)

Search (title, domain, location, skills)

Domain filtering and work-mode filtering (all of these can be combined)

Server-side validation with per-field error messages

Application submission with duplicate-application prevention

Consistent error responses and HTTP status codes

Central error handling (no stack traces or database details leak out)

Parameterized SQL everywhere (no SQL injection)

Schema and seed data (INT-101 to INT-105)

Accessible front end: search, filters, cards, details dialog and application form

Automated tests (75 API tests + a restart-persistence test)

Technology

Part

Choice

Runtime

Node.js

Web framework

Express.js 5

Database

SQLite via Node's built-in node:sqlite module

Language

JavaScript (CommonJS)

Tests

Node's built-in test runner (node --test)

The only npm dependency is express. There is nothing to compile, so npm install works the same on Windows, macOS and Linux (no Visual Studio Build Tools needed).

Requirements

Node.js 22.13 or newer (Node 24 works too)
npm

Why not Node 18? The project uses the SQLite module that ships inside Node (node:sqlite), which first became available without flags in Node 22.13. Node 18 and 20 have reached end of life. Check your version with node -v. Node prints a one-line ExperimentalWarning: SQLite is an experimental feature at startup. It is harmless.

Installation

git clone <repository-url>
cd internship-board
npm install

Environment

Settings are optional. To change them, copy .env.example to .env:

PORT=3000
DATABASE_PATH=./database/internship-board.db

.env is listed in .gitignore and must never be committed.

A relative DATABASE_PATH is resolved from the project folder.

There are no secrets in this project.

Run

npm start

or, to restart automatically when you edit code:

npm run dev

Then open:

Front end: http://localhost:3000

API base URL: http://localhost:3000/api

Health check: http://localhost:3000/api/health

Database, schema and seed data

File

Purpose

database/schema.sql

Creates the internships and applications tables (CREATE TABLE IF NOT EXISTS)

database/seed.sql

Inserts INT-101 to INT-105 with INSERT OR IGNORE

database/internship-board.db

The SQLite database file. It is created automatically on first start and is git-ignored

How it behaves:

On every start the schema runs (safe to repeat, it never drops anything).

The seed runs only the first time a database file is created. So a seed record you delete stays deleted after a restart, and existing data is never overwritten.

skills is stored as JSON text (SQLite has no array type) and returned by the API as a real array.

The same applicant email cannot apply to the same internship twice (UNIQUE (internship_id, applicant_email), case-insensitive).

Useful commands:

npm run db:init   # create the database file, tables and first-run seed, then exit
npm run db:seed   # re-insert any missing INT-101..INT-105 (existing rows untouched)

To start from scratch, stop the server and delete database/internship-board.db. It is recreated with the seed records on the next start.

Response format

Success:

{ "status": "success", "data": {}, "pagination": {} }

pagination appears only on the list endpoint:

"pagination": { "page": 1, "limit": 10, "total": 5, "totalPages": 1 }

Error:

{
  "status": "error",
  "error": { "code": "ERROR_CODE", "message": "Human readable message", "fields": {} }
}

fields appears only for validation errors.

HTTP status

Used for

200

Successful GET, PUT, DELETE

201

Successful POST (created)

400

Invalid input (VALIDATION_ERROR, INVALID_JSON, PAYLOAD_TOO_LARGE)

404

Not found (INTERNSHIP_NOT_FOUND, ROUTE_NOT_FOUND)

409

Conflict (DUPLICATE_ID, DUPLICATE_APPLICATION, INTERNSHIP_HAS_APPLICATIONS)

500

Unexpected error (INTERNAL_SERVER_ERROR)

Internship data model

Field

Type

Rules

id

string

Required on create. Unique. Letters, numbers, - and _ only (max 50). Never changes

title

string

Required, not blank (max 150)

domain

string

Required, not blank (max 100)

mode

string

Remote, Hybrid or On-site

location

string

Required, not blank (max 100)

skills

array of strings

At least one, each non-blank (max 20 skills, 50 characters each)

openings

integer

0 or more

Text values are trimmed before they are saved.

API reference

GET /api/health

Checks that the API is running. 200

{ "status": "success", "data": { "message": "Internship API is running" } }

GET /api/internships

Lists internships, with search, filters and pagination. Ordered by id.

Query parameter

Default

Rules

page

1

Positive integer

limit

10

Positive integer, maximum 100

search

none

Case-insensitive text found in title, domain, location or any skill (max 100 characters)

domain

none

Exact domain, case-insensitive (for example UI/UX)

mode

none

Remote, Hybrid or On-site (letter case ignored)

200 response for GET /api/internships?page=1&limit=2:

{
  "status": "success",
  "data": [
    { "id": "INT-101", "title": "Frontend Intern", "domain": "Full Stack Development", "mode": "Remote", "location": "India", "skills": ["HTML", "CSS", "JavaScript"], "openings": 3 },
    { "id": "INT-102", "title": "API Engineering Intern", "domain": "Full Stack Development", "mode": "Hybrid", "location": "Pune", "skills": ["Node.js", "SQL", "Testing"], "openings": 2 }
  ],
  "pagination": { "page": 1, "limit": 2, "total": 5, "totalPages": 3 }
}

A page past the end returns data: [] with status 200. When nothing matches, total is 0 and totalPages is 0.

400 for bad query values, for example ?page=0&mode=Moon:

{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid query parameters",
    "fields": {
      "page": "Page must be a positive integer",
      "mode": "Mode must be one of: Remote, Hybrid, On-site"
    }
  }
}

GET /api/internships/:id

Returns one internship. 200

{
  "status": "success",
  "data": { "id": "INT-101", "title": "Frontend Intern", "domain": "Full Stack Development", "mode": "Remote", "location": "India", "skills": ["HTML", "CSS", "JavaScript"], "openings": 3 }
}

404 INTERNSHIP_NOT_FOUND:

{ "status": "error", "error": { "code": "INTERNSHIP_NOT_FOUND", "message": "Internship not found" } }

POST /api/internships

Creates an internship. Body (all seven fields required):

{
  "id": "INT-106",
  "title": "Backend Developer Intern",
  "domain": "Full Stack Development",
  "mode": "Remote",
  "location": "India",
  "skills": ["Node.js", "Express", "SQLite"],
  "openings": 2
}

201 returns { "status": "success", "data": { ...the new internship } }

400 VALIDATION_ERROR:

{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid internship data",
    "fields": { "title": "Title is required", "openings": "Openings must be a non-negative integer" }
  }
}

409 DUPLICATE_ID:

{ "status": "error", "error": { "code": "DUPLICATE_ID", "message": "An internship with this ID already exists" } }

PUT /api/internships/:id

Replaces the six editable fields of an existing internship. Send title, domain, mode, location, skills and openings.

{
  "title": "Frontend Developer Intern",
  "domain": "Full Stack Development",
  "mode": "Hybrid",
  "location": "India",
  "skills": ["HTML", "CSS", "JavaScript", "React"],
  "openings": 4
}

200 returns the updated internship.

400 VALIDATION_ERROR for invalid data. The ID cannot be changed: if the body contains an id different from the one in the URL, the response is 400 with fields.id = "ID cannot be changed".

404 INTERNSHIP_NOT_FOUND when the internship does not exist.

DELETE /api/internships/:id

Deletes an internship.

200

{ "status": "success", "data": { "message": "Internship deleted successfully" } }

404 INTERNSHIP_NOT_FOUND when it does not exist.

409 INTERNSHIP_HAS_APPLICATIONS when applications exist for it. Applications are kept rather than silently orphaned or deleted.

POST /api/applications

Submits an application.

{ "internship_id": "INT-101", "applicant_name": "John Doe", "applicant_email": "john@example.com" }

201

{ "status": "success", "data": { "message": "Application submitted successfully", "application_id": 1 } }

The response does not repeat the applicant's name or email.

400 VALIDATION_ERROR when internship_id or applicant_name is missing or blank, or the email is invalid. Example fields: { "applicant_email": "Applicant email must be a valid email address" }.

404 INTERNSHIP_NOT_FOUND when the internship does not exist.

409 DUPLICATE_APPLICATION when the same email (any letter case) already applied to that internship:

{ "status": "error", "error": { "code": "DUPLICATE_APPLICATION", "message": "This applicant has already applied for this internship" } }

Other errors (any endpoint)

Situation

Status

Code

Unknown route

404

ROUTE_NOT_FOUND

Request body is not valid JSON

400

INVALID_JSON

Request body larger than 10 KB

400

PAYLOAD_TOO_LARGE

Unexpected server or database failure

500

INTERNAL_SERVER_ERROR (message: "An unexpected error occurred")

cURL examples

The examples below are for macOS, Linux and Git Bash. Windows PowerShell users: curl is an alias for a different command there. Use curl.exe, or use the PowerShell examples in docs/api-examples.md.

# Health
curl http://localhost:3000/api/health

# List, pagination, search, filters
curl http://localhost:3000/api/internships
curl "http://localhost:3000/api/internships?page=1&limit=2"
curl "http://localhost:3000/api/internships?search=frontend"
curl "http://localhost:3000/api/internships?domain=UI/UX"
curl "http://localhost:3000/api/internships?mode=Remote"
curl "http://localhost:3000/api/internships?search=intern&domain=Full%20Stack%20Development&mode=Remote&page=1&limit=5"

# Detail
curl http://localhost:3000/api/internships/INT-101

# Create
curl -X POST http://localhost:3000/api/internships \
  -H "Content-Type: application/json" \
  -d '{"id":"INT-106","title":"Backend Developer Intern","domain":"Full Stack Development","mode":"Remote","location":"India","skills":["Node.js","Express"],"openings":2}'

# Update
curl -X PUT http://localhost:3000/api/internships/INT-106 \
  -H "Content-Type: application/json" \
  -d '{"title":"Backend Engineer Intern","domain":"Full Stack Development","mode":"Hybrid","location":"Pune","skills":["Node.js","Express","SQLite"],"openings":4}'

# Delete
curl -X DELETE http://localhost:3000/api/internships/INT-106

# Apply
curl -X POST http://localhost:3000/api/applications \
  -H "Content-Type: application/json" \
  -d '{"internship_id":"INT-101","applicant_name":"John Doe","applicant_email":"john@example.com"}'

More examples, including error cases, are in docs/api-examples.md.

Project structure

internship-board/
├── src/
│   ├── server.js                  # Express app, middleware, routes, startup
│   ├── db.js                      # Opens SQLite, runs schema and first-run seed
│   ├── routes/
│   │   ├── internships.js         # /api/internships routes
│   │   └── applications.js        # /api/applications route
│   ├── controllers/
│   │   ├── internshipController.js  # SQL + logic for internships
│   │   └── applicationController.js # SQL + logic for applications
│   ├── middleware/
│   │   ├── validation.js          # Input validation
│   │   └── errorHandler.js        # 404 and central error handler
│   └── utils/
│       └── response.js            # Success/error response helpers, ApiError
├── public/                        # Front end (index.html, styles.css, app.js)
├── database/
│   ├── schema.sql
│   ├── seed.sql
│   └── internship-board.db        # created on first start (git-ignored)
├── tests/
│   ├── api.test.js                # API tests (temporary database)
│   └── persistence.test.js        # Stop / restart persistence test
├── docs/
│   ├── api-examples.md
│   ├── test-report.md
│   └── walkthrough.md
├── .env.example
├── .gitignore
├── package.json
└── README.md

Security and privacy

SQL injection: every query that uses user input passes it as a ? parameter. The only SQL text that is built dynamically is fixed fragments (WHERE ... AND ...), never user input. % and _ typed into the search box are escaped so they match literally.

Validation: every field is checked on the server; unknown fields are ignored; bodies are limited to 10 KB.

Errors: database and unexpected errors are logged for the developer only; users get a generic message.

Logs: the server logs only METHOD /path status (no query string, no body) and Application submitted for internship INT-101. Names, emails and request bodies are never logged. Body-parsing errors are answered before logging, because those error objects can contain the raw body.

XSS: the front end builds the page with textContent, never innerHTML.

URLs: no endpoint accepts URL fields, so there is nothing to URL-validate. If one is added later, only http: and https: should be allowed.

Secrets: none exist. .env and *.db are git-ignored.

Tests

npm test

This runs the API tests and the persistence test against temporary database files. Your real database is not touched. The results of the last run are in docs/test-report.md.

Accessibility

Built into the front end (public/):

Semantic landmarks (header, main, footer, nav, a role="search" form), one h1, and a "Skip to internships" link

Every input has a visible <label>; every action is a real <button>

The details view is a native modal <dialog>: it opens from a button, traps focus while open, closes with Esc or the Close button, and returns focus to the button that opened it

Visible focus outline on all interactive elements

Result count and loading text are announced through a polite live region; errors use role="alert"

Form errors appear next to the field, are linked with aria-describedby and aria-invalid, and focus moves to the first invalid field

Pagination buttons use aria-disabled, so focus is not lost when you reach the first or last page

Loading, empty, error and Try again states are real states driven by the API request

Layout is one column at 360px, two at tablet width and three on desktop, with wrapping text and no fixed widths

Respects prefers-reduced-motion

Checks that were actually run:

The front-end logic was exercised in a simulated browser (jsdom): loading, results, search, empty state, filters, details dialog, application form validation and success/duplicate messages, API-down error state, retry, and pagination (23 of 23 checks passed). This was a throwaway script and is not part of the repository.

Checks still to be done by you in a real browser before submitting. None of these have been performed yet, so they are not marked as done:

Check

How

Result

Keyboard navigation

Press Tab from the top of the page: skip link, search, domain, mode, Search, Clear, each card button, pagination

passed

Search with the keyboard

Type in Search, press Enter

passed

Filters with the keyboard

Change Domain / Work mode with the arrow keys

passed

Details dialog with the keyboard

Enter on "View details", Tab around inside, Esc to close, focus returns to the button

passed

Application form with the keyboard

Fill name and email, submit with Enter; try empty and invalid values

passed

Focus visibility

Confirm a clear outline on every control while tabbing

passed

360px layout

Browser DevTools, device width 360: no horizontal scrollbar, dialog and forms usable

passed

Fill in the Result column after you have tried each one.

Deployment

The project is deployed on Render and available as a live demo:

Live Demo: https://edvyro-task-2-internship-board.onrender.com

API Health Check: https://edvyro-task-2-internship-board.onrender.com/api/health

GitHub: https://github.com/vanshsaini982006-byte/edvyro-task-2-internship-board

Two-minute walkthrough

A step-by-step script for the walkthrough video is in docs/walkthrough.md.