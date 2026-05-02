export type RevisionMeta = {
	id: number;
	timestamp: string;
	user: string;
	comment: string;
};

export type BlockBlame = {
	html: string;
	text: string;
	revision: RevisionMeta | null;
};

export type PageBlame = {
	title: string;
	lang: string;
	url: string;
	blocks: BlockBlame[];
	revisions: RevisionMeta[];
};

const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, '_');

const normalizeText = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

const buildWikiOrigin = (lang: string) => `https://${lang}.wikipedia.org`;

const extractTitleFromUrl = (input: string): string | null => {
	try {
		const url = new URL(input);
		if (!url.hostname.endsWith('wikipedia.org')) return null;
		if (url.pathname.startsWith('/wiki/')) {
			return url.pathname.slice(6);
		}
		if (url.pathname === '/w/index.php') {
			return url.searchParams.get('title') || null;
		}
	} catch {
		return null;
	}
	return null;
};

export const parseWikipediaTitleInput = (input: string): { title: string; lang: string } | null => {
	const trimmed = input.trim();
	if (!trimmed) return null;

	const urlTitle = extractTitleFromUrl(trimmed);
	if (urlTitle) {
		const url = new URL(trimmed);
		const hostParts = url.hostname.split('.');
		const lang = hostParts[0] || 'en';
		return { title: normalizeTitle(urlTitle), lang };
	}

	return { title: normalizeTitle(trimmed), lang: 'en' };
};

// helper removed: unused

const parseArticleBlocks = (html: string) => {
	const parser = new DOMParser();
	const doc = parser.parseFromString(html, 'text/html');
	const root = doc.querySelector('.mw-parser-output') ?? doc.body;
	const elements = Array.from(
		root.querySelectorAll(
			'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, table, ul, ol, dl, dd, dt, figure'
		)
	);

	const isDuplicateContainer = (el: Element) => {
		const tag = el.tagName;

		if ((tag === 'UL' || tag === 'OL') && el.querySelector('li')) return true;
		if (tag === 'DL' && (el.querySelector('dd') || el.querySelector('dt'))) return true;

		return false;
	};

	return elements
		.filter((el) => !isDuplicateContainer(el))
		.map((el) => {
			const text = normalizeText(el.textContent ?? '');
			const hasImage = /<img\b/i.test(el.outerHTML);
			return {
				html: el.outerHTML,
				text,
				keep: Boolean(text.length) || hasImage
			};
		})
		.filter((block) => block.keep)
		.map((block) => ({ html: block.html, text: block.text }));
};

const fetchJson = async <T>(url: string): Promise<T> => {
	const response = await fetch(url, { credentials: 'omit' });
	if (!response.ok) {
		throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
	}
	return response.json();
};

const fetchPageHtml = async (title: string, lang: string): Promise<string> => {
	const encoded = encodeURIComponent(title);
	const url = `${buildWikiOrigin(lang)}/api/rest_v1/page/html/${encoded}`;
	const response = await fetch(url, { credentials: 'omit' });
	if (!response.ok) {
		throw new Error(`Unable to fetch article HTML (${response.status})`);
	}
	return response.text();
};

const fetchRevisionMetadata = async (
	title: string,
	lang: string,
	limit: number | 'max' = 10
): Promise<RevisionMeta[]> => {
	const encoded = encodeURIComponent(title);
	const rvlimit = limit === 'max' ? 'max' : limit;
	const apiUrl = `${buildWikiOrigin(lang)}/w/api.php?action=query&format=json&origin=*&prop=revisions&titles=${encoded}&rvprop=ids|timestamp|user|comment&rvlimit=${rvlimit}&rvdir=older`;
	const data = await fetchJson<{ query?: { pages?: Record<string, unknown> } }>(apiUrl);
	const pages = data.query?.pages ?? {};
	const page = Object.values(pages)[0] as
		| { revisions?: Array<Record<string, unknown>> }
		| undefined;
	const revisions = Array.isArray(page?.revisions) ? page.revisions : [];
	return revisions.reverse().map((rev) => {
		const r = rev as { revid?: number; timestamp?: string; user?: string; comment?: string };
		return {
			id: Number(r.revid ?? 0),
			timestamp: r.timestamp ?? '',
			user: r.user || 'Unknown',
			comment: r.comment || ''
		};
	});
};

const fetchRevisionHtml = async (
	title: string,
	lang: string,
	revisionId: number
): Promise<string | null> => {
	const encoded = encodeURIComponent(title);
	const url = `${buildWikiOrigin(lang)}/api/rest_v1/page/html/${encoded}/${revisionId}`;
	try {
		const response = await fetch(url, { credentials: 'omit' });
		if (!response.ok) return null;
		return response.text();
	} catch {
		return null;
	}
};

const assignRevisionBlame = (
	blocks: { html: string; text: string }[],
	revisionHtmls: Array<{ meta: RevisionMeta; text: string }>
): BlockBlame[] => {
	if (revisionHtmls.length === 0) {
		return blocks.map((block) => ({ html: block.html, text: block.text, revision: null }));
	}

	return blocks.map((block) => {
		if (!block.text) {
			return {
				html: block.html,
				text: block.text,
				revision: revisionHtmls[revisionHtmls.length - 1].meta
			};
		}

		const blockNorm = normalizeText(block.text);
		let blame = revisionHtmls[revisionHtmls.length - 1].meta;

		for (let i = 0; i < revisionHtmls.length; i += 1) {
			if (revisionHtmls[i].text.includes(blockNorm)) {
				blame = revisionHtmls[i].meta;
				break;
			}
		}

		return { html: block.html, text: block.text, revision: blame };
	});
};

export const fetchPageBlame = async (
	title: string,
	lang: string,
	revisionLimit = 50
): Promise<PageBlame> => {
	const normalizedTitle = normalizeTitle(title);
	const pageUrl = `${buildWikiOrigin(lang)}/wiki/${encodeURIComponent(normalizedTitle)}`;
	const pageHtml = await fetchPageHtml(normalizedTitle, lang);
	const blocks = parseArticleBlocks(pageHtml);
	const revisionMeta = await fetchRevisionMetadata(normalizedTitle, lang, revisionLimit);

	const revisionHtmls = await Promise.all(
		revisionMeta.map(async (meta) => {
			const html = await fetchRevisionHtml(normalizedTitle, lang, meta.id);
			return {
				meta,
				text: html
					? normalizeText(new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '')
					: ''
			};
		})
	);

	const blamedBlocks = assignRevisionBlame(blocks, revisionHtmls);

	return {
		title: normalizedTitle,
		lang,
		url: pageUrl,
		blocks: blamedBlocks,
		revisions: revisionMeta
	};
};
