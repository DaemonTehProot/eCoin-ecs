<script>
    import { getContext } from "svelte";
    import { send_del_generic } from "$lib/common/cmd";
    
    import { twMerge } from "tailwind-merge";
    import { inputClass } from "flowbite-svelte/Radio.svelte";

    import { Card, Heading } from "flowbite-svelte";
    import { TrashBinOutline } from "flowbite-svelte-icons";

    /** @type {(s:string) => Promise<boolean>}           */ const confirmMsg  = getContext("confirmMsg");
    /** @type {import("svelte/store").Writable<any>} */     const data        = getContext("serverData");
    /** @type {import("svelte/store").Writable<number>} */  const activeClass = getContext("activeClass");
    /** @type {import("svelte/store").Writable<boolean>} */ const spinner     = getContext("spinner");


    $: users = $data.users;
    $: purchases = $data.purchases.filter(v => v.cId===$activeClass);

    let selected = [];
    let in_delete = false;

    $: grid_cols = in_delete ? `grid-cols-[5fr_8fr_10fr_5fr_2fr]` : `grid-cols-[5fr_8fr_10fr_5fr]`;

    
    async function delete_selected()
    {
        if(selected.length) {
            if(await confirmMsg(`Delete ${selected.length} selected items?`))
                send_del_generic('purchases', [selected], spinner, data)
        }
    }
</script>

<div id="tab-Purchases" class="space-y-4 flex flex-col h-fit items-center">

    <Card class="text-center w-full h-fit" size="none">
        <div class="mb-3 flex items-center justify-between">

            <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                Purchase List
            </Heading>

            <button class={twMerge(`w-fit h-fit p-1 rounded-full outline-3 outline-red-700 dark:outline-red-600
                hover:text-red-700 dark:hover:text-red-600`, in_delete && 'outline text-red-700 dark:text-red-600')}

                on:click={async () => { in_delete && await delete_selected(); in_delete=!in_delete; }}
            >
                <TrashBinOutline size="lg" />
            </button>
        </div>


        <div class={twMerge(`grid font-bold text-lg text-center 
            border-b border-gray-200 dark:border-gray-700 py-1`, grid_cols)}
        >
            <p>User</p> <p>Desc</p> 
            <p>Quantity</p> <p>Date</p>
        </div>

        <ul class="font-semibold divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
            {#each purchases.toReversed() as { id, uId, desc, quant, updated }}
            
            {@const date = new Date(updated).toLocaleDateString()}
            {@const uName = users.find(v => v.id===uId)?.name ?? '(Unknown)'}

            <li class={twMerge(`text-center py-1 text-md w-full h-fit grid`, grid_cols)}>
                <p>{uName}</p> <p>{desc}</p>
                <p>{quant}</p> <p>{date}</p>

                {#if in_delete}
                    <input type="checkbox" value={id} bind:group={selected} 
                        class={inputClass(false, 'red', true, true, 'me-2', '')} 
                    />
                {/if}
            </li>
            {/each}
        </ul>
    </Card>
</div>