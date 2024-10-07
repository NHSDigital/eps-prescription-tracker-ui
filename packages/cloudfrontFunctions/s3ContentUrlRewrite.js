// TODO
// Intercepts all calls to .../site/* for static content from s3.
// Rewrite calls to s3 as needed to resolve to the correct objects in s3,
// so that we can handle requests for pages that only exist virtually within the client,
// and allow for clean urls client side (i.e. url/site rather than url/site/current_version/index.html)

// If url ends with / -> redirect to a version of .index.html
    // if url contains v* (e.g. url/site/v1.2.3/) then redirect to index.html from the specified versions directory
    // if url contains pr-* (e.g. url/site/pr-123/) then redirect to index.html from the specified PR's directory
    // else redirect to the index.html from the current versions directory 
// else urls ends with a specified file extension (.js, .png etc) -> redirect to a version of that file
    // if url contains v* (e.g. url/site/v1.2.3/script.js) then redirect to specified file from the specified versions directory
    // if url contains pr-* (e.g. url/site/pr-123/script.js) then redirect to specified file from the specified PR's directory
    // else redirect to specified file from the current versions directory
