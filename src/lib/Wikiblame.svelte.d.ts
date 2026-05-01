import type { SvelteComponentTyped } from 'svelte';

export interface WikiblameProps {
	initialQuery?: string;
	autoLoad?: boolean;
}

export default class Wikiblame extends SvelteComponentTyped<WikiblameProps> {}
