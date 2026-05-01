<script module lang="ts">
	export interface Props {
		initialQuery?: string;
		autoLoad?: boolean;
	}
</script>

<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import { fetchPageBlame, parseWikipediaTitleInput, type BlockBlame } from '$lib/wiki';

	const { initialQuery = 'Svelte', autoLoad = false } = $props() as Props;

	type BlockView = BlockBlame & { safeHtml: string };

	let query = $state(initialQuery);
	let title = $state('');
	let lang = $state('en');
	let pageUrl = $state('');
	let blocks = $state<BlockView[]>([]);
	let revisions = $state<Array<{ id: number; timestamp: string; user: string; comment: string }>>(
		[]
	);
	let status = $state<'idle' | 'loading' | 'error' | 'ready'>('idle');
	let error = $state('');
	let dompurifyReady = $state(false);
	let sanitizeHtml = $state((html: string) => html);

	const formatDate = (value: string) => {
		try {
			return new Intl.DateTimeFormat('en-US', {
				year: 'numeric',
				month: 'short',
				day: '2-digit'
			}).format(new Date(value));
		} catch {
			return value;
		}
	};

	const ensureSanitizer = async () => {
		if (!dompurifyReady && browser) {
			const DOMPurify = (await import('dompurify')).default;
			sanitizeHtml = (html: string) => DOMPurify.sanitize(html, { ADD_ATTR: ['loading'] });
			dompurifyReady = true;
		}
	};

	const loadArticle = async (value: string) => {
		status = 'loading';
		error = '';
		blocks = [];

		const parsed = parseWikipediaTitleInput(value);
		if (!parsed) {
			status = 'error';
			error = 'Please enter a Wikipedia page title or URL.';
			return;
		}

		try {
			await ensureSanitizer();
			const pageBlame = await fetchPageBlame(parsed.title, parsed.lang, 10);
			title = pageBlame.title;
			lang = pageBlame.lang;
			pageUrl = pageBlame.url;
			revisions = pageBlame.revisions;
			blocks = pageBlame.blocks.map((block) => ({
				...block,
				safeHtml: sanitizeHtml(block.html)
			}));
			status = 'ready';
		} catch (err) {
			status = 'error';
			error = err instanceof Error ? err.message : 'Failed to load article.';
		}
	};

	const handleSubmit = async (event: Event) => {
		event.preventDefault();
		await loadArticle(query);
	};

	onMount(async () => {
		if (browser) {
			await ensureSanitizer();
			if (autoLoad && query) {
				await loadArticle(query);
			}
		}
	});
</script>

<main class="page">
	<section class="hero">
		<h1>Wikiblame</h1>
		<p>
			Inspect any Wikipedia article in a blame-style view. Each content block is annotated with the
			revision that introduced it.
		</p>

		<form class="search" onsubmit={handleSubmit}>
			<label class="sr-only" for="article-input">Wikipedia title or URL</label>
			<input
				id="article-input"
				type="text"
				placeholder="Wikipedia title or URL"
				bind:value={query}
			/>
			<button type="submit">Load article</button>
		</form>

		{#if status === 'loading'}
			<div class="status">Loading article…</div>
		{:else if status === 'error'}
			<div class="error">{error}</div>
		{/if}
	</section>

	{#if status === 'ready'}
		<section class="meta">
			<p>
				Viewing <a href={pageUrl} target="_blank" rel="noreferrer noopener">{title}</a> from
				<a href={`https://${lang}.wikipedia.org`} target="_blank" rel="noreferrer noopener">
					{lang}.wikipedia.org</a
				>.
			</p>
			<p>{revisions.length} recent revisions loaded for blame attribution.</p>
		</section>

		<section class="blame-grid">
			{#each blocks as block, index (block.revision?.id != null ? `${block.revision.id}-${index}` : index)}
				<div
					class="blame-cell"
					title={block.revision
						? `${block.revision.user} — ${block.revision.comment}`
						: 'Unknown revision'}
				>
					{#if block.revision}
						<a
							href={`https://${lang}.wikipedia.org/w/index.php?oldid=${block.revision.id}`}
							target="_blank"
							rel="noreferrer"
						>
							<time datetime={block.revision.timestamp}>{formatDate(block.revision.timestamp)}</time
							>
						</a>
					{:else}
						<span class="unknown">unknown</span>
					{/if}
				</div>
				<div class="content-cell">
					<div class="block-html">{@html block.safeHtml}</div>
				</div>
			{/each}
		</section>
	{/if}
</main>

<style>
	.page {
		max-width: 1100px;
		margin: 0 auto;
		padding: 2rem 1.25rem 4rem;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
	}

	.hero {
		margin-bottom: 1.75rem;
	}

	h1 {
		font-size: clamp(2rem, 4vw, 3rem);
		margin: 0 0 0.75rem;
	}

	p {
		margin: 0.75rem 0;
		line-height: 1.65;
	}

	.search {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	input[type='text'] {
		min-width: 0;
		padding: 0.85rem 1rem;
		border: 1px solid #c0c0c5;
		border-radius: 0.75rem;
		font-size: 1rem;
	}

	button {
		padding: 0.85rem 1.25rem;
		border: none;
		border-radius: 0.75rem;
		background: #1f7aec;
		color: white;
		font-weight: 600;
		cursor: pointer;
	}

	button:hover {
		background: #1667c5;
	}

	.status,
	.error {
		margin-top: 1rem;
		padding: 1rem;
		border-radius: 0.75rem;
	}

	.status {
		background: #eef4ff;
		border: 1px solid #bfd4ff;
	}

	.error {
		background: #ffe8e8;
		border: 1px solid #f2c2c2;
		color: #8c1a1a;
	}

	.meta {
		margin: 1.5rem 0;
		padding: 1.25rem 1.5rem;
		background: #f8fbff;
		border: 1px solid #d7e5f7;
		border-radius: 1rem;
	}

	.blame-grid {
		display: grid;
		grid-template-columns: 180px 1fr;
		gap: 0;
		border-top: 1px solid #e2e8f0;
	}

	.blame-cell,
	.content-cell {
		padding: 0.9rem 1rem;
		border-bottom: 1px solid #e2e8f0;
	}

	.blame-cell {
		border-right: 1px solid #e2e8f0;
		background: #fafbff;
		font-size: 0.88rem;
		line-height: 1.5;
	}

	.blame-cell a {
		color: #1f7aec;
		text-decoration: none;
	}

	.blame-cell a:hover {
		text-decoration: underline;
	}

	.unknown {
		color: #6b7280;
	}

	.content-cell {
		background: white;
	}

	.block-html :global(img) {
		max-width: 100%;
		height: auto;
	}

	.block-html :global(table) {
		max-width: 100%;
		overflow: auto;
	}

	@media (max-width: 900px) {
		.blame-grid {
			grid-template-columns: 1fr;
		}

		.blame-cell {
			border-right: none;
		}
	}

	@media (max-width: 640px) {
		.page {
			padding: 1.25rem;
		}

		.search {
			grid-template-columns: 1fr;
		}
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
