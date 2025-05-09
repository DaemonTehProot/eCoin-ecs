const defaultTheme = require('tailwindcss/defaultTheme');

const config = {
	content: [
		'./src/**/*.{html,js,svelte,ts,md}',
		'./node_modules/flowbite-svelte/**/*.{html,js,svelte,ts}'
	],

	darkMode: 'class',
	plugins: [require('flowbite/plugin')({charts:true})],

	theme: {
		fontFamily: { sans: ['Inter', ...defaultTheme.fontFamily.sans]},
		
		extend: {
			colors: {
				// flowbite-svelte
				primary: {
					50: '#FFF5F2',
					100: '#FFF1EE',
					200: '#FFE4DE',
					300: '#FFD5CC',
					400: '#FFBCAD',
					500: '#FE795D',
					600: '#EF562F',
					700: '#EB4F27',
					800: '#CC4522',
					900: '#A5371B'
				}		
			},

			gridTemplateColumns: {
				"auto-fit":  "auto",
				"auto-fill": "repeat(auto-fill, minmax(min-content, 200px))",
			}
		}
	}
};

module.exports = config;