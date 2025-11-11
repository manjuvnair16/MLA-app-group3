# Input Validation Rules
This document lists the validation rules that are enforced for each input field.

Currently these validations are all applied in the GraphQL Gateway.
The backend Authservice places the same validations for Email and Password on the `/signup` and `/login` endpoints, plus basic size checks for First and Last names.

**To Do**:
- Apply sanitization/validation in our backend services (activity-tracking, analytics)
- Apply basic validations on the frontend for instant user feedback (don't allow user to submit inputs that are too long for example) 
- and make sure errors are caught with a user-friendly message displayed by the frontend

### Email / username
`local_part@domain-part.com`

- Required string, trimmed & lowercased
- Length 5 - 254 after sanitization
- Must match regex pattern: `^[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`
- *Local part* must be 1 - 64 characters, no leading/trailing/consecutive dots
- *Domain part* must be 4 - 255 characters, no leading/trailing/consecutive dots
- Malicious patterns (basic SQL/XSS) rejected prior to sanitization (enforced in graphql-gateway)


### Password

- Frontend enforces password confirmation equality before submit
- Password can not be blank
- Must be between 8 and 128 characters
- Must match regex pattern: `^(?=.{8,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9])\\S+$`
(must contain at least one uppercase letter, one lowercase letter, one number, and one special character)


### Names (First Name / Last Name)

- Only letters, spaces, apostrophes, and hyphens allowed
- Length 1 - 50
- HTML-like tags are stripped/sanitized

### IDs

The graphql-gateway validates IDs

- Required string
- Pattern: `^[a-zA-Z0-9_-]{1,100}$`
(alphanumeric, underscore, hyphen; 1–100 chars)
- Basic sanitization to prevent SQL injection

### Exercise Type

- Required string
- Length 1 - 100
- Allowed characters: letters, spaces, hyphens, underscores
- Sanitized for XSS/SQL

### Description / text fields

- Optional (null/undefined/empty → null)
- Must be string if present
- Max length 1000 (validated BEFORE sanitization)
- Sanitized for XSS/SQL


### Duration / numeric fields

- Required numeric integer
- Accepts numeric string conversion
- Must be integer ≥ 1 and ≤ 100000

### Date and Date Ranges

- Accepted format: YYYY-MM-DD or ISO 8601 timestamp
- Start date must be before end date
- Date range must be less than 365 days

