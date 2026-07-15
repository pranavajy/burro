import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
	{
		ignores: ['dist/**', 'out/**', 'release/**', 'node_modules/**'],
	},
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			parser: tseslint.parser,
		},
		plugins: {
			'react-hooks': reactHooks,
		},
	},
]
