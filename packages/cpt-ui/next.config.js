/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: process.env.NEXT_OUTPUT_MODE || undefined,
  basePath: process.env.BASE_PATH || "",

  // If we're using a local development server, we want to be able
  // to call out to an actual API for testing.
  // This rewrites all requests to the /api/ path.
  async rewrites() {
    if (process.env.LOCAL_DEV) {
      return [
        {
          source: "/api/:path*",
          destination: `${process.env.API_DOMAIN_OVERRIDE}/api/:path*`,
          basePath: false
        }
      ]
    }

    return []
  }
}

module.exports = nextConfig
