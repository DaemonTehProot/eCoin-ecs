<script>
    import { twMerge } from "tailwind-merge";
    import { writable } from "svelte/store";
    
    import { getContext } from "svelte";
    import { inputClass } from "flowbite-svelte/Radio.svelte";

    import { int2cash, int2color, errorPopup } from "$lib/common/utils";
    import { send_add_generic, send_del_generic, send_set_generic, refetch_server, initString } from "$lib/common/cmd";

    import { TrashBinOutline, PlusOutline, EditOutline } from "flowbite-svelte-icons";
    import { Button, Card, FloatingLabelInput, Heading, Modal } from "flowbite-svelte";

    /** @type {(s:string) => Promise<boolean>}           */ const confirmMsg  = getContext("confirmMsg");
    /** @type {import("svelte/store").Writable<any>} */     const data        = getContext("serverData");
    /** @type {import("svelte/store").Writable<number>} */  const activeClass = getContext("activeClass");
    /** @type {import("svelte/store").Writable<boolean>} */ const spinner     = getContext("spinner");


    $: users = $data.users.filter(v => v.cId === $activeClass);
    $: active = $data.activeBids.filter(v => v.cId === $activeClass);
    $: placed = $data.placedBids.filter(v => v.cId === $activeClass);


    let in_state = null;
    let bid_results = null;

    let activeBid = null;
    let selectedBids = [];

    $: grid_cols = (in_state==='delete') ? 'grid-cols-[2fr_2fr_1fr]' 
                                            : 'grid-cols-[1fr_1fr]';

//>=================================================================================<//

    function create_new_bid()
    {
        const desc =  document.querySelector('input#bid_desc')?.value;
        const cost = +document.querySelector('input#bid_cost')?.value * 100;
        
        if(desc.length === 0) { errorPopup.set(`Please set something for Description`); return; }
        if(cost > 0 || isNaN(cost)) { errorPopup.set(`Please set a negative or zero value for Minimum Bid`); return; }

        send_add_generic('activeBids', [{ cId: $activeClass, amount: cost, desc }], spinner, data);
    }

    async function delete_bids()
    {
        if(selectedBids.length) {
            if(await confirmMsg(`Delete ${selectedBids.length} bids?`))
            {
                await send_del_generic('activeBids', [selectedBids], spinner, data);
                if(selectedBids.some(v => v === activeBid?.id)) activeBid = null;
            }
        }

        selectedBids.length = 0;
    }

    async function edit_bids()
    {
        const desc =  document.querySelector('input#bid_desc_mod')?.value;
        const cost = +document.querySelector('input#bid_cost_mod')?.value * 100;

        if(!desc.length) { errorPopup.set('Please set somthing for Description'); return; }
        if(cost > 0 || isNaN(cost)) { errorPopup.set('Please set a negative or zero value for Amount'); return; }

        await send_set_generic('activeBids', [activeBid.id], { desc, amount: cost }, spinner, data);

        // Do Not Remove
        activeBid = active.find(v => v.id === activeBid.id);
    }

    const arrange_bids = (data, bId) => {
        return data.filter(v => v.bId === bId).sort((a,b) => b.amount - a.amount);
    }


    async function close_bid()
    {
        const body = { bId: activeBid.id, max: Math.max(~~(users.length / 5), 1) };

        spinner.set(true);
        const res = await fetch('/admin/api/bid', { body: JSON.stringify(body), method: 'POST' });

        const info = await res.json();
        spinner.set(false);

        if(res.ok) show_results(info);
        else errorPopup.set(`Error: ${info.message}`);

        refetch_server(initString, '/admin', data);
    }

    function show_results(info) { bid_results=info; in_state='results'; }
</script>

<div id="tab-Bids" class="flex flex-row gap-4 items-start">

    <Card class="text-center w-1/2 h-fit overflow-y-auto" size="none">
        <div class="mb-3 flex flex-row items-center justify-between">

            <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                Active Bids
            </Heading>

            <div class="flex flex-row items-center gap-2">
                <button class={twMerge(`w-fit h-fit p-1 rounded-full outline-3 outline-green-600 dark:outline-green-500
                    hover:text-green-600 dark:hover:text-green-500`, (in_state==="create" && 'outline text-green-600 dark:text-green-500'))}
                    on:click={() => { in_state = (in_state==="create") ? null : "create"; }}    
                >
                    <PlusOutline size="lg" />
                </button>

                <button class={twMerge(`w-fit h-fit p-1 rounded-full outline-3 outline-red-700 dark:outline-red-600
                    hover:text-red-700 dark:hover:text-red-600`, (in_state==='delete') && 'outline text-red-700 dark:text-red-600')}
                    on:click={async () => { (in_state==='delete') && await delete_bids(); in_state = (in_state==='delete') ? null : 'delete'; }}
                >
                    <TrashBinOutline size="lg" />
                </button>
            </div>
        </div>

        <div class={twMerge(`grid font-bold text-lg text-center py-1 pt-4
            border-b border-gray-200 dark:border-gray-700`, grid_cols)}
        >
            <p>Desc</p> <p>Amount</p>
        </div>

        <ul class="font-semibold divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
        {#each active as bid}
        {@const { id, amount, desc } = bid}
        
            <li class="font-semibold text-center text-md w-full h-fit hover:bg-gray-100 dark:hover:bg-gray-700">
                <button class={twMerge(`grid py-1 w-full h-full items-center`, grid_cols)} 
                    on:click={() => !in_state && (activeBid = bid)}
                >
                    <p>{desc}</p>
                    <p class={int2color(amount)}>{int2cash(amount)}</p>
                
                    {#if in_state==="delete"}
                        <input type="checkbox" value={id} bind:group={selectedBids} 
                            class={inputClass(false, 'red', true, true, 'me-2', '')}
                        />
                    {/if}
                </button>
            </li>
        {:else}
            <div class="mt-4 flex flex-row justify-center text-xl">
                No Bids Active
            </div>
        {/each}
        </ul>
    </Card>

    <div class="flex flex-col w-1/2 gap-4">
        <Card class="text-center w-full h-fit overflow-y-auto" size="none">
            <div class="mb-6 flex flex-row items-center justify-between">
    
                <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                    Bid Details
                </Heading>
    
                <div class="flex flex-row items-center gap-2">
                    <button class={twMerge(`w-fit h-fit p-1 rounded-full outline-3 outline-green-600 dark:outline-green-500
                        hover:text-green-600 dark:hover:text-green-500`, (in_state==="modify" && 'outline text-green-600 dark:text-green-500'))}
                        on:click={async () => { if(activeBid) { (in_state==="modify") && await edit_bids(); in_state = (in_state==="modify") ? null : "modify"; }}}    
                    >
                        <EditOutline size="lg" />
                    </button>
                </div>
            </div>
    
        {#if activeBid}
        {@const { amount, desc, cId } = activeBid}
        {@const cName = $data.classes.find(v => v.id===cId)?.name}
    
            <div class="text-left text-xl font-semibold">
            {#if in_state!=="modify"}
                <div class="mb-4 flex flex-row gap-x-3">
                    <div class="text-primary-600 dark:text-primary-500">
                        <p>Cost:</p>
                        <p>Class:</p>
                    </div>
                    <div class="text-xl">
                        <p class={int2color(amount)}>{int2cash(amount)}</p>
                        <p>{cName}</p>
                    </div>
                </div>
    
                <div class="mb-4 flex flex-row gap-x-3">
                    <p class="text-primary-600 dark:text-primary-500">Description:</p>
                    <p class="text-lg">{desc}</p>
                </div>
    
                <div class="flex flex-row w-full justify-center">
                    <Button color="primary" class="w-1/3 text-lg font-semibold"
                        on:click={() => close_bid()}
                    >
                        Close Bid
                    </Button>
                </div>
            {:else}
                <div class="mb-4 flex flex-row gap-x-3">
                    <div class="text-primary-600 dark:text-primary-500">
                        <p>Cost:</p>
                        <p>Class:</p>
                    </div>
                    <div class="text-xl">
                        <FloatingLabelInput id="bid_cost_mod" value={(amount*.01).toLocaleString("en-US", { minimumFractionDigits: 2 })} 
                            classInput={twMerge("text-lg font-semibold py-0 w-16", int2color(amount))} />
    
                        <p>{cName}</p>
                    </div>
                </div>
    
                <div class="mb-4 flex flex-row gap-x-3">
                    <p class="text-primary-600 dark:text-primary-500">Description:</p>
                    
                    <FloatingLabelInput id="bid_desc_mod" value={desc} 
                        classInput="font-semibold text-lg py-0 text-gray-500 dark:text-gray-400" />
                </div>
            {/if}
            </div>
        {:else}
            <div class="w-full flex flex-row justify-center text-lg sm:text-xl font-semibold">
                <p>No Bid Selected</p>
            </div>
        {/if}
        </Card>

    {#if activeBid}
        <Card class="text-center w-full h-fit overflow-y-auto" size="none">
            <div class="w-full flex flex-row items-start">
                <Heading tag="h3" class="mb-4 text-xl sm:text-2xl font-semibold dark:text-white max-w-fit">
                    Placed Bids
                </Heading>
            </div>
    
            <div class="grid grid-cols-[1fr_1fr] font-bold text-lg py-1 pt-4
                text-center border-b border-gray-200 dark:border-gray-700"
            >
                <p>User</p>
                <p>Amount</p>
            </div>
    
            <ul class="font-medium divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800 max-w-full">
            {#each arrange_bids(placed, activeBid.id) as {uId, amount}}
            {@const uName = users.find(v => v.id === uId).name}
    
                <li class="my-1 grid grid-cols-[1fr_1fr] items-center w-full h-fit">
                    <p>{uName}</p>
                    <p class={int2color(amount)}>{int2cash(amount)}</p>
                </li>
            {/each}
            </ul>
        </Card>
    {/if}
    </div>

    {#if in_state==="create"}
    <Modal open size="xs" classBody="space-y-0"
        on:close={() => in_state==="create" && (in_state=null)}
    >
        <div class="flex flex-col w-full gap-y-6">
            <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">
                Create A New Bid
            </h3>

            <FloatingLabelInput classInput="font-semibold" id="bid_desc">Description</FloatingLabelInput>
            <FloatingLabelInput classInput="font-semibold" id="bid_cost" type="number">Minimum Bid</FloatingLabelInput>

            <div class="w-full flex flex-row justify-center">
                <Button color="primary" class="w-1/2 font-semibold text-md"
                    on:click={() => create_new_bid()}
                >
                    Create
                </Button>
            </div>
        </div>
    </Modal>
    {:else if in_state==="results"}
    <Modal open autoclose size="xs" classBody="space-y-0"
        on:close={() => in_state==="results" && (in_state=null)}
    >
        <div class="flex flex-col w-full gap-y-6">
            <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">
                Finished Bid Results
            </h3>

            <div class="w-full flex flex-col items-center text-left mb-3 gap-2">
            {#each bid_results as { uId, amount }}
            {@const name = users.find(v => v.id===uId).name}

                <h3 class="text-lg font-semibold text-gray-500 dark:text-gray-400 flex flex-row">
                    <p class="pr-3">{name}:</p> 
                    <p class={int2color(-amount)}>{int2cash(-amount)}</p>
                </h3>
            {:else}
                <h3>None</h3>
            {/each}
            </div>

            <Button color="primary" class="me-2">Ok</Button>
        </div>
    </Modal>
    {/if}
</div>