<script lang="ts">
	import { page } from '$app/stores';
	import Wikiblame from '$lib/Wikiblame.svelte';
</script>

<Wikiblame initialQuery={$page.data?.title ?? ''} autoLoad={true} />
