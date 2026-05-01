<script lang="ts">
	import { page } from '$app/stores';
	import Wikiblame from '$lib/Wikiblame.svelte';
</script>

<Wikiblame initialQuery={$page.data.title as any} autoLoad={true as any} />
