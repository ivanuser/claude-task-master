/** @type {import('next').NextConfig} */
const nextConfig = {
	output: 'standalone',
	
	// Allow Cloudflare tunnel domain
	async headers() {
		return [
			{
				source: '/:path*',
				headers: [
					{
						key: 'X-Frame-Options',
						value: 'SAMEORIGIN'
					}
				]
			}
		];
	},

	// Transpile packages from the monorepo
	transpilePackages: ['task-master-ai'],

	// Custom webpack configuration
	webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
		// Handle imports from the parent project
		config.resolve.alias = {
			...config.resolve.alias,
			'@task-master': '../../src',
			'@taskmaster': '../../'
		};

		return config;
	},

	// Environment variables
	env: {
		CUSTOM_KEY: 'task-master-dashboard'
	},

	// Image domains (for future use)
	images: {
		domains: ['github.com', 'gitlab.com']
	},

	// Rewrites for API routes
	async rewrites() {
		return [
			{
				source: '/api/taskmaster/:path*',
				destination: '/api/:path*'
			}
		];
	}
};

module.exports = nextConfig;
