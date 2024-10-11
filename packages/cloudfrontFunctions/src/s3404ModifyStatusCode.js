// TODO

// Modifies the responses back from s3 for all calls that were previously not caught by configured origin path patterns (/site, /api, /auth etc).
// These responses should return the static 404 file from the root of the content s3 bucket.
// As these calls were previously rewritten to resolve to this file they will return from 
// s3 with a 200 response as the file exists and could be retrieved.
// So this function intercepts these responses in order to modify the status code to the expected 404 code.
