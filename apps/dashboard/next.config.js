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
	
	// Allow dev origins for Cloudflare tunnel (recommended approach)
	allowedDevOrigins: ['taskmanagerai.honercloud.com'],
	
	// Transpile packages from the monorepo
	transpilePackages: ['task-master-ai'],

	// Webpack configuration to handle SSH2 module issues
	webpack: (config, { isServer }) => {
		if (!isServer) {
			// Don't resolve these modules on the client side
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
				dns: false,
				child_process: false,
				'cpu-features': false,
			};
		}
		
		// Ignore the sshcrypto.node file
		config.module.rules.push({
			test: /\.node$/,
			use: 'null-loader',
		});
		
		return config;
	},

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
					},
					{
						key: 'Access-Control-Allow-Origin',
						value: process.env.NODE_ENV === 'development' ? 'http://localhost:3002' : 'https://taskmanagerai.honercloud.com'
					},
					{
						key: 'Access-Control-Allow-Methods',
						value: 'GET, POST, PUT, DELETE, OPTIONS'
					},
					{
						key: 'Access-Control-Allow-Headers',
						value: 'Content-Type, Authorization, Cookie, Set-Cookie'
					},
					{
						key: 'Access-Control-Allow-Credentials',
						value: 'true'
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
