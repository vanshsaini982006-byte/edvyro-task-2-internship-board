'use strict';

// Server-side validation. Each function checks the incoming data and either
//   - stores a cleaned copy on the request (req.validated / req.listQuery), or
//   - throws an ApiError (400) that lists every problem field.

const { ApiError } = require('../utils/response');

const ALLOWED_MODES = ['Remote', 'Hybrid', 'On-site'];
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;
// Practical email check: something@domain.tld with no spaces and a dot in the domain part.
const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

const LIMITS = {
  id: 50,
  title: 150,
  domain: 100,
  location: 100,
  skill: 50,
  skillCount: 20,
  search: 100,
  applicantName: 100,
  email: 254,
};
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const MAX_PAGE = 1000000;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Returns an error message, or null when the value is a good string.
function checkString(value, label, maxLength) {
  if (value === undefined || value === null) return `${label} is required`;
  if (typeof value !== 'string') return `${label} must be a string`;
  const trimmed = value.trim();
  if (trimmed === '') return `${label} is required`;
  if (trimmed.length > maxLength) return `${label} must be at most ${maxLength} characters`;
  return null;
}

// ---------- Internship body (POST and PUT) ----------

function validateInternshipFields(body, { requireId }) {
  const fields = {};
  const value = {};

  if (requireId) {
    const problem = checkString(body.id, 'ID', LIMITS.id);
    if (problem) {
      fields.id = problem;
    } else if (!ID_PATTERN.test(body.id.trim())) {
      fields.id = 'ID may only contain letters, numbers, hyphens and underscores';
    } else {
      value.id = body.id.trim();
    }
  }

  const textFields = [
    ['title', 'Title', LIMITS.title],
    ['domain', 'Domain', LIMITS.domain],
    ['location', 'Location', LIMITS.location],
  ];
  for (const [key, label, maxLength] of textFields) {
    const problem = checkString(body[key], label, maxLength);
    if (problem) {
      fields[key] = problem;
    } else {
      value[key] = body[key].trim();
    }
  }

  if (body.mode === undefined || body.mode === null) {
    fields.mode = 'Mode is required';
  } else if (!ALLOWED_MODES.includes(body.mode)) {
    fields.mode = `Mode must be one of: ${ALLOWED_MODES.join(', ')}`;
  } else {
    value.mode = body.mode;
  }

  if (body.skills === undefined || body.skills === null) {
    fields.skills = 'Skills are required';
  } else if (!Array.isArray(body.skills)) {
    fields.skills = 'Skills must be an array of strings';
  } else if (body.skills.length === 0) {
    fields.skills = 'Skills must contain at least one skill';
  } else if (body.skills.length > LIMITS.skillCount) {
    fields.skills = `Skills must contain at most ${LIMITS.skillCount} items`;
  } else if (body.skills.some((s) => typeof s !== 'string' || s.trim() === '')) {
    fields.skills = 'Each skill must be a non-empty string';
  } else if (body.skills.some((s) => s.trim().length > LIMITS.skill)) {
    fields.skills = `Each skill must be at most ${LIMITS.skill} characters`;
  } else {
    value.skills = body.skills.map((s) => s.trim());
  }

  if (body.openings === undefined || body.openings === null) {
    fields.openings = 'Openings is required';
  } else if (!Number.isSafeInteger(body.openings) || body.openings < 0) {
    fields.openings = 'Openings must be a non-negative integer';
  } else {
    value.openings = body.openings;
  }

  return { fields, value };
}

function validateInternshipBody({ requireId }) {
  return (req, res, next) => {
    const body = req.body;
    if (!isPlainObject(body)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid internship data', {
        body: 'Request body must be a JSON object',
      });
    }

    const { fields, value } = validateInternshipFields(body, { requireId });

    // PUT: the ID lives in the URL and can never be changed through the body.
    if (!requireId && body.id !== undefined && String(body.id).trim() !== req.params.id) {
      fields.id = 'ID cannot be changed';
    }

    if (Object.keys(fields).length > 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid internship data', fields);
    }

    req.validated = value;
    next();
  };
}

// ---------- Application body (POST /api/applications) ----------

function validateApplicationBody(req, res, next) {
  const body = req.body;
  if (!isPlainObject(body)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid application data', {
      body: 'Request body must be a JSON object',
    });
  }

  const fields = {};
  const value = {};

  const idProblem = checkString(body.internship_id, 'Internship ID', LIMITS.id);
  if (idProblem) fields.internship_id = idProblem;
  else value.internshipId = body.internship_id.trim();

  const nameProblem = checkString(body.applicant_name, 'Applicant name', LIMITS.applicantName);
  if (nameProblem) fields.applicant_name = nameProblem;
  else value.applicantName = body.applicant_name.trim();

  const emailProblem = checkString(body.applicant_email, 'Applicant email', LIMITS.email);
  if (emailProblem) {
    fields.applicant_email = emailProblem;
  } else if (!EMAIL_PATTERN.test(body.applicant_email.trim())) {
    fields.applicant_email = 'Applicant email must be a valid email address';
  } else {
    value.applicantEmail = body.applicant_email.trim().toLowerCase();
  }

  if (Object.keys(fields).length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid application data', fields);
  }

  req.validated = value;
  next();
}

// ---------- List query string (GET /api/internships) ----------

function parsePositiveInteger(raw, { defaultValue, max, label }) {
  if (raw === undefined) return { value: defaultValue };
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    return { error: `${label} must be a positive integer` };
  }
  const number = Number(raw);
  if (!Number.isSafeInteger(number) || number < 1) {
    return { error: `${label} must be a positive integer` };
  }
  if (number > max) {
    return { error: `${label} must be no greater than ${max}` };
  }
  return { value: number };
}

function validateListQuery(req, res, next) {
  const query = req.query;
  const fields = {};

  const page = parsePositiveInteger(query.page, { defaultValue: DEFAULT_PAGE, max: MAX_PAGE, label: 'Page' });
  if (page.error) fields.page = page.error;

  const limit = parsePositiveInteger(query.limit, { defaultValue: DEFAULT_LIMIT, max: MAX_LIMIT, label: 'Limit' });
  if (limit.error) fields.limit = limit.error;

  // Text filters: an empty value simply means "no filter".
  let search = '';
  if (query.search !== undefined) {
    if (typeof query.search !== 'string') fields.search = 'Search must be a single text value';
    else if (query.search.trim().length > LIMITS.search) fields.search = `Search must be at most ${LIMITS.search} characters`;
    else search = query.search.trim();
  }

  let domain = '';
  if (query.domain !== undefined) {
    if (typeof query.domain !== 'string') fields.domain = 'Domain must be a single text value';
    else if (query.domain.trim().length > LIMITS.domain) fields.domain = `Domain must be at most ${LIMITS.domain} characters`;
    else domain = query.domain.trim();
  }

  // Mode is matched case-insensitively (remote -> Remote) but must be one of the allowed values.
  let mode = '';
  if (query.mode !== undefined) {
    if (typeof query.mode !== 'string') {
      fields.mode = 'Mode must be a single text value';
    } else if (query.mode.trim() !== '') {
      const match = ALLOWED_MODES.find((m) => m.toLowerCase() === query.mode.trim().toLowerCase());
      if (match) mode = match;
      else fields.mode = `Mode must be one of: ${ALLOWED_MODES.join(', ')}`;
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid query parameters', fields);
  }

  req.listQuery = { page: page.value, limit: limit.value, search, domain, mode };
  next();
}

module.exports = {
  ALLOWED_MODES,
  validateCreateInternship: validateInternshipBody({ requireId: true }),
  validateUpdateInternship: validateInternshipBody({ requireId: false }),
  validateApplicationBody,
  validateListQuery,
};
