<script lang="ts">
    import { P } from 'flowbite-svelte';

    export let mainClass = 'bg-gray-50 dark:bg-gray-900';
    export let mainDivClass = 'flex flex-col items-center justify-center px-6 pt-8 mx-auto md:h-screen pt:mt-0 dark:bg-gray-900';

    export let pClass = 'mb-5 text-base font-normal text-gray-500 dark:text-gray-400 md:text-lg';
    export let h1Class = 'mb-3 text-2xl font-bold leading-tight text-gray-900 sm:text-4xl lg:text-5xl dark:text-white';
</script>

<main class={mainClass}>
    <div class={mainDivClass}>

        <h1 class={h1Class}>Under Maintenance</h1>
        <P class={pClass}>Sorry, but this might be awile. Please check back later \^.^/</P>
    </div>
</main>