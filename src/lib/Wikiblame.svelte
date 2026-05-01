<script module lang="ts">
	export interface Props {
		initialQuery?: string;
		autoLoad?: boolean;
	}
</script>

<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import {
		fetchPageBlame,
		parseWikipediaTitleInput,
		type BlockBlame,
		type RevisionMeta
	} from '$lib/wiki';

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
	let revisionLimit = $state(50);
	let loadingMore = $state(false);
	let dompurifyReady = $state(false);
	let sanitizeHtml = $state((html: string) => html);

	let status = $state('idle');
	let error = $state('');

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

	// Return true when the given revision id matches the earliest-loaded
	// revision and we haven't loaded past the current revision limit.
	const isEarliestLoadedRevision = (revId?: number) => {
		return revisions.length === revisionLimit && revisions.length > 0 && revId === revisions[0]?.id;
	};

	const revisionDiffUrl = (revision: RevisionMeta) => {
		const revisionIndex = revisions.findIndex((item) => item.id === revision.id);
		if (revisionIndex > 0) {
			return `https://${lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(
				title
			)}&diff=${revision.id}&oldid=${revisions[revisionIndex - 1].id}`;
		}

		return `https://${lang}.wikipedia.org/w/index.php?oldid=${revision.id}`;
	};

	const ensureSanitizer = async () => {
		if (!dompurifyReady && browser) {
			const DOMPurify = (await import('dompurify')).default;
			sanitizeHtml = (html: string) => DOMPurify.sanitize(html, { ADD_ATTR: ['loading'] });
			dompurifyReady = true;
		}
	};

	const loadArticle = async (value: string) => {
		revisionLimit = 50;
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
			const pageBlame = await fetchPageBlame(parsed.title, parsed.lang, revisionLimit);
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

	const loadMoreRevisions = async () => {
		if (loadingMore || status !== 'ready' || !title) return;
		loadingMore = true;
		const nextLimit = revisionLimit + 50;

		try {
			const pageBlame = await fetchPageBlame(title, lang, nextLimit);
			revisions = pageBlame.revisions;
			blocks = pageBlame.blocks.map((block) => ({
				...block,
				safeHtml: sanitizeHtml(block.html)
			}));
			revisionLimit = nextLimit;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load more revisions.';
			status = 'error';
		} finally {
			loadingMore = false;
		}
	};

	const handleSubmit = async (event: Event) => {
		event.preventDefault();
		await loadArticle(query);
	};

	// Compute a light (pastel) background color for a revision based on its
	// index within the current `revisions` array. Oldest -> red, middle ->
	// yellow, newest -> green. Returns a CSS color string or empty string.
	const getRevisionBg = (revisionId?: number) => {
		if (!revisionId || revisions.length === 0) return '';
		const idx = revisions.findIndex((r) => r.id === revisionId);
		if (idx === -1) return '';
		const total = revisions.length;
		const t = total <= 1 ? 1 : idx / (total - 1); // 0..1 (oldest..newest)
		const hue = Math.round(t * 120); // 0 (red) -> 60 (yellow) -> 120 (green)
		const saturation = 80; // fairly saturated but light overall via L
		const lightness = 95; // very light pastel for good contrast with black text
		return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
	};

	// Group consecutive blocks that share the same revision so we can render
	// a single revision cell that spans the rows for that group. Use a
	// function (not a reactive declaration) to avoid runes-mode `$:` rules.
	const getGroupedBlocks = () => {
		type Group = { revision: RevisionMeta | null; items: BlockView[] };
		const groups: Group[] = [];
		let current: Group | null = null;
		for (const block of blocks) {
			const revId = block.revision?.id ?? null;
			if (!current || (current.revision?.id ?? null) !== revId) {
				current = { revision: block.revision ?? null, items: [] };
				groups.push(current);
			}
			current.items.push(block);
		}
		return groups;
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
				Viewing
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={pageUrl} target="_blank" rel="noreferrer noopener">{title}</a>
				from
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a href={`https://${lang}.wikipedia.org`} target="_blank" rel="noreferrer noopener">
					{lang}.wikipedia.org</a
				>.
			</p>
			<p>
				{revisions.length} recent revisions loaded for blame attribution
				{#if revisions.length}
					({formatDate(revisions[0].timestamp)} – {formatDate(
						revisions[revisions.length - 1].timestamp
					)})
				{/if}
				.
			</p>
			{#if revisions.length === revisionLimit}
				<button type="button" onclick={loadMoreRevisions} disabled={loadingMore}>
					{#if loadingMore}Loading next 50 revisions…{:else}Load next 50 revisions{/if}
				</button>
			{/if}
			<section class="blame-grid">
				{#each getGroupedBlocks() as group, gi (gi)}
					<div
						class="blame-cell"
						class:earliest={isEarliestLoadedRevision(group.revision?.id)}
						title={group.revision ? `${group.revision.user} — ${group.revision.comment}` : 'Unknown revision'}
						style={
							group.revision
								? `--rev-bg: ${getRevisionBg(group.revision.id)}; grid-row: span ${group.items.length}`
								: undefined
						}
					>
						{#if group.revision}
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
							<a href={revisionDiffUrl(group.revision)} target="_blank" rel="noreferrer">
								<time datetime={group.revision.timestamp}>
									{formatDate(group.revision.timestamp)}
									{#if isEarliestLoadedRevision(group.revision?.id)}
										<span class="earliest-mark" aria-hidden="true">*</span>
									{/if}
								</time>
							</a>
						{:else}
							<span class="unknown">unknown</span>
						{/if}
					</div>

					{#each group.items as block, i (i)}
						<div
							class="content-cell"
							class:earliest={isEarliestLoadedRevision(block.revision?.id)}
							style={block.revision ? `--rev-bg: ${getRevisionBg(block.revision.id)}` : undefined}
						>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							<div class="block-html">{@html block.safeHtml}</div>
						</div>
					{/each}
				{/each}
			</section>
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
		background: var(--rev-bg, #fafbff);
		font-size: 0.88rem;
		line-height: 1.5;
	}

	/* Rows that reference the earliest-loaded revision (and where older
	   revisions may exist) get a subtle grey background to indicate there
	   may be earlier history not included in this fetch. */
	.blame-cell.earliest,
	.content-cell.earliest {
		background: #f3f4f6;
	}

	.earliest-mark {
		margin-left: 0.25rem;
		color: #6b7280;
		font-size: 0.85em;
		vertical-align: super;
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
		background: var(--rev-bg, white);
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
