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
	transpilePackages: ['task-master-ai']
};

module.exports = nextConfig;
