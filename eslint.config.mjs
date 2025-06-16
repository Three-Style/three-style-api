import globals from 'globals';
import pluginJs from '@eslint/js';
import pluginPrettier from 'eslint-plugin-prettier';
import configPrettier from 'eslint-config-prettier';

export default [
	{
		files: ['**/*.js'],
		languageOptions: {
			globals: globals.node,
		},
		plugins: {
			prettier: pluginPrettier,
		},
		rules: {
			['prettier/prettier']: 'error',
		},
	},
	pluginJs.configs.recommended,
	configPrettier,
	{
		ignores: ['node_modules/', 'src/public/**/*'],
	},
	{
		rules: {
			'no-async-promise-executor': 'off',
			'no-unused-vars': 'error',
			'no-unreachable': 'warn',
			'no-multiple-empty-lines': [
				'error',
				{
					max: 1,
					maxEOF: 0,
					maxBOF: 0,
				},
			],
		},
	},
];
