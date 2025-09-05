/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	swcMinify: true,
	eslint: {
		// Disable ESLint during builds for production deployment
		ignoreDuringBuilds: true,
	},
	typescript: {
		// Disable type checking during builds (handled separately)
		ignoreBuildErrors: true,
	},
	images: {
		domains: ['github.com', 'gitlab.com', 'localhost'],
		formats: ['image/avif', 'image/webp']
	},
	
	// Transpile packages from the monorepo
	transpilePackages: ['task-master-ai'],

	// Add headers to prevent caching of dynamic content
	async headers() {
		return [
			{
				// Apply cache control to API routes
				source: '/api/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
					},
					{
						key: 'Pragma',
						value: 'no-cache'
					},
					{
						key: 'Expires',
						value: '0'
					}
				],
			},
			{
				// Apply cache control to dashboard routes
				source: '/dashboard/:path*',
				headers: [
					{
						key: 'Cache-Control',
						value: 'no-store, no-cache, must-revalidate, proxy-revalidate'
					}
				],
			}
		]
	}
};

module.exports = nextConfig;
