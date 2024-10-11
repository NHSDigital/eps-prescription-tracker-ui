# Cloudfront Functions
This folder contains the following cloudfront functions:
- **s3ContentUriRewrite:** rewrites request uri's from `/site/*` for requests for static content from the CPT content bucket.
- **s3JwksUriRewrite:** rewrites request uri's from `/jwks/` for requests made for the jwks endpoint. Matches the exact path and only requests the jwks json file from the root of the CPT content bucket.
- **s3404UriRewrite:** rewrites request uri's from the default (catch all) cloudfront behavior. Only requests the 404 page from the root of the CPT content bucket.
- **s3404ModifyStatusCode:** modifies the status code of responses to the default (catch all) cloudfront behavior. Ensures that the 404 page is returned with a correct 404 status code.

## Example URI Rewrites
| Request URI | Origin URI |
|-------------|------------|
| `/site/` | `/v<current_version>/index.html` |
| `/site/some_page/` | `/v<current_version>/index.html` |
| `/site/some_page/some_other_page/` | `/v<current_version>/index.html` |
| `/site/file.ext` | `/v<current_version>/file.ext` |
| `/site/images/file.ext` | `/v<current_version>/images/file.ext` |
| `/site/vx.x.x/` | `/vx.x.x/index.html` |
| `/site/vx.x.x/some_page/` | `/vx.x.x/index.html` |
| `/site/vx.x.x/some_page/some_other_page/` | `/vx.x.x/index.html` |
| `/site/vx.x.x/file.ext` | `/vx.x.x/file.ext` |
| `/site/vx.x.x/images/file.ext` | `/vx.x.x/images/file.ext` |
| `/site/pr-xxxx/` | `/pr-xxxx/index.html` |
| `/site/pr-xxxx/some_page/` | `/pr-xxxx/index.html` |
| `/site/pr-xxxx/some_page/some_other_page/` | `/pr-xxxx/index.html` |
| `/site/pr-xxxx/file.ext` | `/pr-xxxx/file.ext` |
| `/site/pr-xxxx/images/file.ext` | `/pr-xxxx/images/file.ext` |
| `/api/endpoint_a/` | `/endpoint_a` |
| `/api/pr-xxxx/endpoint_a/` | `/pr-xxxx/endpoint_a` |
| `/auth/token/` | `/token` |
| `/jwks/` | `/jwks.json` |
| Default (catch all) | `/404.html` |

todo: sort these notes out
  /* Split the request uri, Cloudfront will make requests to the origin with the path included,
  e.g. /site/file.etx with the expectation that this aligns with the directory structure in the bucket,
  e.g. root -> site -> file.etx but as we are structuring the bucket as root -> vx.x.x -> file.etx we need to
  intercept the request and strip put the cloudfront path*/
/* As we want clean urls on the browser for pages , e.g. www.our_domain.com/site rather than
    www.our_domain.com/site/index.html we need to intercept these requests before they hit the s3 origin
    and rewrite them so that the call to s3 properly resolves to the index.html file. As our client
    is a SPA this also covers scenarios where the browser may request a route that only exists in the client,
    e.g site/page_1, because the user refreshed or bookmarked a page etc, by also retuning index.html in these
    scenarios we gracefully handle the call whilst passing back to the client to handle the page routing*/


// Modifies the responses back from s3 for all calls that were previously not caught by configured origin path patterns (/site, /api, /auth etc).
// These responses should return the static 404 file from the root of the content s3 bucket.
// As these calls were previously rewritten to resolve to this file they will return from
// s3 with a 200 response as the file exists and could be retrieved.
// So this function intercepts these responses in order to modify the status code to the expected 404 code.
