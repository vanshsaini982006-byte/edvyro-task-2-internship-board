'use strict';

const { db, isConstraintError } = require('../db');
const { sendSuccess, ApiError } = require('../utils/response');

function duplicateApplication() {
  return new ApiError(409, 'DUPLICATE_APPLICATION', 'This applicant has already applied for this internship');
}

// POST /api/applications
function createApplication(req, res) {
  const { internshipId, applicantName, applicantEmail } = req.validated;

  const internship = db.prepare('SELECT id FROM internships WHERE id = ?').get(internshipId);
  if (!internship) {
    throw new ApiError(404, 'INTERNSHIP_NOT_FOUND', 'Internship not found');
  }

  const existing = db
    .prepare('SELECT id FROM applications WHERE internship_id = ? AND applicant_email = ?')
    .get(internshipId, applicantEmail);
  if (existing) throw duplicateApplication();

  let result;
  try {
    result = db
      .prepare('INSERT INTO applications (internship_id, applicant_name, applicant_email) VALUES (?, ?, ?)')
      .run(internshipId, applicantName, applicantEmail);
  } catch (err) {
    // The UNIQUE (internship_id, applicant_email) rule is the final safety net.
    if (isConstraintError(err)) throw duplicateApplication();
    throw err;
  }

  // Privacy: log only the internship ID. Never the name, the email or the request body.
  if (process.env.NODE_ENV !== 'test') {
    console.log(`Application submitted for internship ${internship.id}`);
  }

  sendSuccess(
    res,
    { message: 'Application submitted successfully', application_id: Number(result.lastInsertRowid) },
    { status: 201 }
  );
}

module.exports = { createApplication };
