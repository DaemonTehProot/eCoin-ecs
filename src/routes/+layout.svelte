<script>
    import { errorPopup } from "$lib/common/utils";
    
    import { Modal, Button } from "flowbite-svelte";
    import { ExclamationCircleOutline } from "flowbite-svelte-icons";
</script>

<slot />

{#if $errorPopup.length}
<Modal open size="xs" autoclose on:close={() => { errorPopup.set('') }}>
    <div class="text-center">
        <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 dark:text-gray-200 w-12 h-12"/>
        <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">{$errorPopup}</h3>

        <Button color="primary" class="me-2">Ok</Button>
    </div>
</Modal>
{/if}