export function load({ params }) {
	const title = Array.isArray(params.title) ? params.title.join('/') : params.title;
	return {
		title: title ? title : 'Main_Page'
	};
}
