/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/lib/**/*.{js,ts,jsx,tsx}'
	],
	safelist: [
		// Color scheme classes for all supported colors
		{
			pattern: /^(bg|text|border|ring)-(blue|purple|green|orange|red|teal|pink|gray)-(50|100|200|300|400|500|600|700|800|900)$/,
			variants: ['hover', 'focus', 'dark', 'dark:hover']
		},
		// Opacity modifiers
		{
			pattern: /^(bg|border)-(blue|purple|green|orange|red|teal|pink|gray)-(50|100|200|300|400|500|600|700|800|900)\/(10|20|30|40|50|60|70|80|90)$/,
			variants: ['hover', 'focus', 'dark', 'dark:hover']
		},
		// Ring classes
		{
			pattern: /^ring-(blue|purple|green|orange|red|teal|pink|gray)-(50|100|200|300|400|500|600|700|800|900)$/,
			variants: ['focus']
		},
		// CSS variable based classes
		'bg-[hsl(var(--primary))]',
		'bg-[hsl(var(--primary))]/10',
		'bg-[hsl(var(--primary))]/20',
		'bg-[hsl(var(--secondary))]',
		'bg-[hsl(var(--accent))]',
		'text-[hsl(var(--primary))]',
		'text-[hsl(var(--primary))]/80',
		'text-[hsl(var(--secondary))]',
		'border-[hsl(var(--primary))]',
		'border-[hsl(var(--primary))]/20',
		'ring-[hsl(var(--primary))]',
		'hover:bg-[hsl(var(--primary))]',
		'hover:bg-[hsl(var(--primary))]/10',
		'hover:text-[hsl(var(--primary))]',
		'hover:text-[hsl(var(--primary))]/80',
		'focus:border-[hsl(var(--primary))]',
		'focus:ring-[hsl(var(--primary))]',
		'dark:bg-[hsl(var(--primary))]/20'
	],
	theme: {
		extend: {
			colors: {
				taskmaster: {
					50: '#f0f9ff',
					100: '#e0f2fe',
					200: '#bae6fd',
					300: '#7dd3fc',
					400: '#38bdf8',
					500: '#0ea5e9',
					600: '#0284c7',
					700: '#0369a1',
					800: '#075985',
					900: '#0c4a6e'
				},
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-conic':
					'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))'
			},
			fontSize: {
				xxs: '0.625rem'
			},
			spacing: {
				18: '4.5rem',
				88: '22rem',
				128: '32rem'
			},
			animation: {
				'fade-in': 'fadeIn 0.5s ease-in-out',
				'slide-up': 'slideUp 0.3s ease-out',
				'slide-down': 'slideDown 0.3s ease-out',
				'spin-slow': 'spin 3s linear infinite',
				'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				},
				slideUp: {
					'0%': { transform: 'translateY(10px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				slideDown: {
					'0%': { transform: 'translateY(-10px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				}
			},
			boxShadow: {
				'inner-sm': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
				'inner-md': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
			},
			screens: {
				'3xl': '1920px'
			}
		}
	},
	plugins: []
};
