import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const dev = process.env.NODE_ENV === 'development';
const repo = 'wikiblame'; // change if your GitHub repo name is different

const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// Use the static adapter for GitHub Pages. Build output lives in `build`.
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: '404.html'
		}),
		// For project pages (https://user.github.io/repo) set the base to the repo name.
		paths: {
			base: dev ? '' : `/${repo}`
		},
		prerender: {
			entries: ['*']
		}
	}
};

export default config;
