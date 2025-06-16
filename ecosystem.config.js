module.exports = {
	apps: [
		{
			name: 'THREE_STYLE-DEV-8080',
			script: './server.js',
			env: {
				NODE_ENV: 'development',
				PORT: 8080,
			},
			max_memory_restart: '350M',
			node_args: '--trace-warnings',
		},
		{
			name: 'THREE_STYLE-PROD-8082',
			script: './server.js',
			env: {
				NODE_ENV: 'production',
				PORT: 8082,
			},
			max_memory_restart: '1024M',
			node_args: '--trace-warnings',
		},
	],
};
