<script>
    import { twMerge } from 'tailwind-merge';
    import { PauseOutline, RefreshOutline } from 'flowbite-svelte-icons';

    let isPaused = true;
    let isRestarted = true;

    let lightLevel = 0.5;

    function togglePause() {
        isPaused = !isPaused;
    }
    function toggleReset() {
        isRestarted = !isRestarted;
    }

</script>

<svelte:head>
    <title>EcoSym - Light</title>
</svelte:head>

<div class="fixed w-full h-full top-0 left-0">
    <div class="fixed w-fit h-fit top-0 left-0 flex flex-col">
        <button class="p-2 m-2 bg-gray-200 rounded hover:bg-gray-300"
                on:click={() => togglePause()}>
            <PauseOutline class="w-6 h-6" />
        </button>
        <button class="p-2 m-2 bg-gray-200 rounded hover:bg-gray-300"
                on:click={() => toggleReset()}>
            <RefreshOutline class="w-6 h-6" />
        </button>
    </div>
</div>