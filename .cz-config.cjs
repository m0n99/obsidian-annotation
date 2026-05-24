module.exports = {
	types: [
		{ value: 'feat', name: 'feat:     A new feature' },
		{ value: 'fix', name: 'fix:      A bug fix' },
		{ value: 'docs', name: 'docs:     Documentation only changes' },
		{ value: 'style', name: 'style:    Formatting-only changes' },
		{
			value: 'refactor',
			name: 'refactor: Code change that neither fixes a bug nor adds a feature'
		},
		{ value: 'perf', name: 'perf:     Performance improvement' },
		{ value: 'test', name: 'test:     Adding or updating tests' },
		{ value: 'chore', name: 'chore:    Build process or auxiliary tooling changes' },
		{ value: 'revert', name: 'revert:   Revert a commit' },
		{ value: 'build', name: 'build:    Build system or dependency changes' },
		{ value: 'ci', name: 'ci:       CI configuration changes' }
	],
	scopes: [
		{ name: 'all' },
		{ name: 'build' },
		{ name: 'deps' },
		{ name: 'docs' },
		{ name: 'plugin' }
	],
	allowCustomScopes: true,
	allowBreakingChanges: ['feat', 'fix']
}
