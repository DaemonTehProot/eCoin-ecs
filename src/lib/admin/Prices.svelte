<script>
    import { writable } from "svelte/store";
    import { twMerge } from "tailwind-merge";
    
    import { getContext } from "svelte";
    import { inputClass } from "flowbite-svelte/Radio.svelte";

    import { errorPopup, int2cash, int2color } from "$lib/common/utils";
    import { refetch_server, send_add_generic, send_del_generic, send_set_generic } from "$lib/common/cmd";

    import { AngleRightOutline, TrashBinOutline, PlusOutline, EditOutline } from "flowbite-svelte-icons";
    import { Card, Heading, Tabs, TabItem, Modal, FloatingLabelInput, Dropdown, DropdownItem, Button, Checkbox } from "flowbite-svelte";


    /** @type {(s:string) => Promise<boolean>}           */ const confirmMsg  = getContext("confirmMsg");
    /** @type {import("svelte/store").Writable<any>} */     const data        = getContext("serverData");
    /** @type {import("svelte/store").Writable<number>} */  const activeClass = getContext("activeClass");
    /** @type {import("svelte/store").Writable<boolean>} */ const spinner     = getContext("spinner");


    $: teams = $data.teams.filter(v => v.cId === $activeClass);
    $: users = $data.users.filter(v => v.cId === $activeClass);
    $: prices = $data.prices.filter(v => v.cId === $activeClass);

    $: mp = $data.classes.find(v => v.id===$activeClass)?.mp ?? 0;


    let in_state = null;
    let selectedPrices = [];

    let activeType = '';
    let activePrice = null;

    let target = null;
    let quantity = 1;
    let enableTax = true;

    
    let __selectedUsers=[]; let selectedUsers=writable(); selectedUsers.set([]);
    let __selectedTeams=[]; let selectedTeams=writable(); selectedTeams.set([]);

    $: {
        __selectedTeams;
        selectedTeams.update(old => 
        {
            if(__selectedTeams.length > old.length) 
            {
                const next = __selectedTeams.filter(v => !old.includes(v))[0];
                const uIds = users.filter(v => v.tId === next).map(v => v.id);

                __selectedUsers = [...new Set(__selectedUsers.concat(uIds))];
            }
            else if(__selectedTeams.length < old.length) 
            {
                const prev = old.filter(v => !__selectedTeams.includes(v))[0];
                __selectedUsers = __selectedUsers.filter(v => users.find(v2 => v2.id===v)?.tId !== prev);
            }

            return __selectedTeams;
        });
    }
    $: { selectedUsers.set(__selectedUsers); }

    
    $: grid_cols = (in_state==='delete') ? 'grid-cols-[2fr_2fr_1fr]' 
                                            : 'grid-cols-[1fr_1fr]';

    const is_posInt = (v) => v>=0;

//<-------------------------------------------------------------->//

    function split_by_type(data) {
        return [
            ['Wage',     data.filter(v => v.type === 'Wage')    ],
            ['Purchase', data.filter(v => v.type === 'Purchase')],
            ['Fine',     data.filter(v => v.type === 'Fine')    ],
        ];
    }

    /** @type {import("svelte/action").Action<HTMLElement, string>}*/
    const set_type = (node, param) => { activeType = param; }


    async function delete_prices()
    {
        if(selectedPrices.length) {
            if(await confirmMsg(`Delete ${selectedPrices.length} prices?`)) 
            {
                await send_del_generic('prices', [selectedPrices], spinner, data);
                if(selectedPrices.some(v => v === activePrice?.id)) activePrice = null;
            }
        }
    
        selectedPrices.length = 0;
    }

    async function create_new_price()
    {
        let desc =  document.querySelector(`input#price_desc`)?.value;
        let cost = +document.querySelector(`input#price_cost`)?.value;
        let perc = +document.querySelector(`input#price_perc`)?.value;
         
        if(!desc.length) { errorPopup.set('Enter something for description'); return; }
        
        if(cost < 0 || isNaN(cost)) { errorPopup.set("Enter a positive number for cost"); return; }
        if(perc < 0 || isNaN(perc)) { errorPopup.set("Enter a positive number for percentage"); return; }

        if(activeType !== 'Wage') cost = -cost;

        const costArray = [...Array(8)].map((_,idx) => ~~(Math.pow(1 + perc*.01, idx) * cost * 100));
        await send_add_generic('prices', [{ desc, cId: $activeClass, type: activeType, cost: costArray }], spinner, data);
    }

    async function edit_prices()
    {
        const desc = document.querySelector('input#price_desc_mod')?.value;
        const cost = Array.from(document.querySelectorAll('input#price_cost_mod').values(), v => (+v.value)*100);

        if(desc.length === 0) { errorPopup.set(`Please leave Description non-blank`); return; }
        if(cost.some(v => isNaN(v))) { errorPopup.set(`Please set Costs to valid numbers`); return; }

        await send_set_generic('prices', [activePrice.id], { desc, cost: JSON.stringify(cost), type: activeType }, spinner, data);
        
        // Do Not Remove
        activePrice = prices.find(v => v.id === activePrice.id);
    }


    async function do_transaction()
    {
        const notes = document.querySelector('input#trans_notes')?.value;

        if(!$selectedUsers.length) { errorPopup.set(`Please set a target`); return; }
        if(!is_posInt(+quantity)) { errorPopup.set('Please set quanity to a positive number'); return; }

        const tax = enableTax ? 0.2 : 0.0;
        const body = { pId: activePrice.id, quant: +quantity, tax, notes, ids: $selectedUsers };

        enableTax = false;

        spinner.set(true);
        const res = await fetch('/admin/api/trans', { body: JSON.stringify(body), method: 'POST' });

        spinner.set(false);
        if(!res.ok) return errorPopup.set(`Error: ${(await res.json()).message}`);

        await refetch_server('users-teams', '/admin', data);
    }

    /** @type {import('svelte/action').Action} */
    function reset_selected_action() { 
        __selectedUsers.length = 0;
        __selectedTeams.length = 0;
    }
</script>

<div id="tab-Prices" class="flex flex-row gap-4 items-start">

    <Card class="text-center w-1/2 h-fit overflow-y-auto" size="none">
        <div class="mb-3 flex flex-row items-center justify-between">

            <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                Price Lists
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
                    on:click={async () => { (in_state==='delete') && await delete_prices(); in_state = (in_state==='delete') ? null : 'delete'; }}
                >
                    <TrashBinOutline size="lg" />
                </button>
            </div>
        </div>

        <Tabs
            contentClass="mt-2 max-h-full"
            defaultClass="flex divide-x rtl:divide-w-reverse divide-gray-200 dark:divide-gray-700"
        >
        {#each split_by_type(prices) as [type, data], idx}
            <TabItem open={idx==0} class="w-full" defaultClass="inline-block 
                text-sm font-semibold text-center disabled:cursor-not-allowed w-full"
            >
                <span slot="title" class="w-full md:text-base" use:set_type={type}>{type}s</span>

                <div class={twMerge(`grid font-bold text-lg text-center py-1 pt-4
                    border-b border-gray-200 dark:border-gray-700`, grid_cols)}
                >
                    <p>Desc</p> <p>Cost</p>
                </div>

                <ul class="font-semibold divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
                {#each data as price}
                {@const { id, cost, desc } = price}
                
                    <li class={twMerge(`font-semibold text-center text-md w-full h-fit 
                        hover:bg-gray-100 dark:hover:bg-gray-700`, id===activePrice?.id && 'bg-gray-100, dark:bg-gray-700')}
                    >
                        <button class={twMerge(`grid py-1 w-full h-full items-center`, grid_cols)} 
                            on:click={() => !in_state && (activePrice = price)}
                        >
                            <p>{desc}</p>
                            <p class={int2color(cost[mp])}>{int2cash(cost[mp])}</p>
                        
                            {#if in_state==="delete"}
                                <input type="checkbox" value={id} bind:group={selectedPrices} 
                                    class={inputClass(false, 'red', true, true, 'me-2', '')}
                                />
                            {/if}
                        </button>
                    </li>
                {/each}
                </ul>
            </TabItem>
        {/each}
        </Tabs>
    </Card>

    
    <Card class="text-center w-1/2 h-fit overflow-y-auto" size="none">
        <div class="mb-6 flex flex-row items-center justify-between">

            <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                Price Details
            </Heading>

            <div class="flex flex-row items-center gap-2">
                <button class={twMerge(`w-fit h-fit p-1 rounded-full outline-3 outline-green-600 dark:outline-green-500
                    hover:text-green-600 dark:hover:text-green-500`, (in_state==="modify" && 'outline text-green-600 dark:text-green-500'))}
                    
                    on:click={async () => { if(activePrice) { 
                        if(in_state==="modify") { await edit_prices(); in_state = null; }
                        else { activeType = activePrice.type; in_state = "modify"; } 
                    }}}    
                >
                    <EditOutline size="lg" />
                </button>
            </div>
        </div>

    {#if activePrice}
    {@const { desc, cost, type, cId } = activePrice}
    {@const cName = $data.classes.find(v => v.id===cId)?.name}

        <div class="text-left text-xl font-semibold">
        {#if in_state!=='modify'}
            <div class="mb-4 flex flex-row gap-x-3">
                <div class="text-primary-600 dark:text-primary-500">
                    <p>Type:</p>
                    <p>Class:</p>
                </div>
                <div class="text-lg"> 
                    <p>{type}</p>
                    <p>{cName}</p>
                </div>
            </div>
            
            <div class="mb-4 flex flex-row gap-x-3">
                <p class="text-primary-600 dark:text-primary-500">Description:</p>
                <p class="text-lg">{desc}</p>
            </div>


            <div class="mb-6 flex flex-row gap-x-3">
                <p class="text-primary-600 dark:text-primary-500">
                    Costs:
                </p>
                
                <div class="flex flex-row flex-wrap items-start gap-2 text-lg">
                {#each cost as v, idx}
                    <div class="flex flex-col gap-1 items-center">
                        <p><span class={int2color(v)}>{int2cash(v)}</span>{idx!==7 ? ',' : ''}</p>
                    </div>
                {/each}
                </div>
            </div>

            <div class="flex flex-row w-full justify-center">
                <Button color="primary" class="w-1/3 text-lg font-semibold"
                    on:click={() => in_state="trans"}
                >
                    Transact
                </Button>
            </div>
        {:else}
            <div class="mb-4 flex flex-row gap-x-3">
                <div class="text-primary-600 dark:text-primary-500">
                    <p>Type:</p>
                    <p>Class:</p>
                </div>
                <div class="text-lg"> 
                    <button class="w-fit h-fit p-1 -mt-1 -ml-1 gap-1 flex flex-row items-center 
                        underline-offset-[6px] hover:text-primary-600 dark:hover:text-primary-500 hover:underline"
                    >
                        {activeType}
                        <AngleRightOutline size="md" />
                    </button>
                    
                    <Dropdown class="py-0" placement="right-start">
                    {#each ['Wage', 'Purchase', 'Fine'] as v}
                        <DropdownItem on:click={() => activeType=v}>
                            {v}
                        </DropdownItem>
                    {/each}
                    </Dropdown>        

                    <p class="-mt-1">{cName}</p>
                </div>
            </div>

            <div class="mb-4 flex flex-row gap-x-3">
                <p class="text-primary-600 dark:text-primary-500">Description:</p>
                
                <FloatingLabelInput id="price_desc_mod" value={desc} 
                    classInput="font-semibold text-lg py-0 text-gray-500 dark:text-gray-400" />
            </div>

            <div class="flex flex-row gap-x-3">
                <p class="text-primary-600 dark:text-primary-500">
                    Costs:
                </p>

                <div class="flex flex-row flex-wrap items-start gap-2 text-lg">
                {#each cost as v, idx}
                    <div class="flex flex-row items-center">
                        <FloatingLabelInput id="price_cost_mod" value={(v*.01).toLocaleString("en-US", { minimumFractionDigits: 2 })} 
                            classInput={twMerge("text-lg font-semibold py-0 w-16", int2color(v))} />
                    </div>
                {/each}
                </div>
            </div>
        {/if}
        </div>
    {:else}
        <div class="w-full flex flex-row justify-center text-lg sm:text-xl font-semibold">
            <p>No Price Selected</p>
        </div>
    {/if}
    </Card>


    {#if in_state==="create"}
    <Modal open size="xs" classBody="space-y-0"
        on:close={() => in_state==="create" && (in_state=null)}
    >
        <div class="flex flex-col w-full gap-y-6">
            <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">
                Create A New Price
            </h3>

            <FloatingLabelInput classInput="font-semibold" id="price_desc">Description</FloatingLabelInput>
            <FloatingLabelInput classInput="font-semibold" id="price_cost" type="number">Inital Cost</FloatingLabelInput>
            <FloatingLabelInput classInput="font-semibold" id="price_perc" type="number">Scale Precentage</FloatingLabelInput>

            <div class="flex flex-row items-center font-semibold gap-1">
                Type:

                <button class="w-fit h-fit p-1 flex flex-row underline-offset-[6px]
                    hover:text-primary-600 dark:hover:text-primary-500 hover:underline"
                >
                    {activeType}
                    <AngleRightOutline size="lg" />
                </button>

                <Dropdown placement="right-start" class="py-0">
                    {#each ['Wage', 'Purchase', 'Fine'] as type}
                        <DropdownItem class="flex flex-row items-center"
                            on:click={() => activeType = type}
                        >
                            {type}
                        </DropdownItem>
                    {/each}
                </Dropdown>
            </div>

            <div class="w-full flex flex-row justify-center">
                <Button color="primary" class="w-1/2 font-semibold text-md"
                    on:click={() => create_new_price()}
                >
                    Create
                </Button>
            </div>
        </div>
    </Modal>

    {:else if in_state==="trans"}
    <Modal open size="xs" classBody="space-y-0"
        on:close={() => in_state==="trans" && (in_state=null)}
    >
        <div class="flex flex-col w-full gap-y-6">
            <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">
                Run a Transaction
            </h3>

            <FloatingLabelInput classInput="font-semibold" id="trans_notes">Notes</FloatingLabelInput>
            <FloatingLabelInput classInput="font-semibold" id="trans_quant" type="number" bind:value={quantity}>Quantity</FloatingLabelInput>

            <Checkbox bind:checked={enableTax} class="font-semibold" id="trans_tax">Enable Tax</Checkbox>

            <div class="gap-y-3">
                <div class="flex flex-row items-center font-semibold gap-1" use:reset_selected_action>
                    Targets:
    
                    <button class="w-fit h-fit p-1 flex flex-row underline-offset-[6px]
                        hover:text-primary-600 dark:hover:text-primary-500 hover:underline"
                    >
                        {`${__selectedUsers.length} Users`}
                        <AngleRightOutline size="lg" />
                    </button>
    
                    <Dropdown placement="right-start" class="py-0 w-fit">
                        <DropdownItem class="flex flex-row items-center justify-between gap-1 w-full">
                            Users <AngleRightOutline size="md" />
                        </DropdownItem>
    
                        <Dropdown placement="right-start" class="py-0 w-fit">
                        {#each users.sort((a,b) => a.name.localeCompare(b.name)) as {name, id}}
                            <li class="flex flex-row justify-left items-center text-left font-medium py-2 px-4 text-sm w-full">
                                <input type="checkbox" value={id} bind:group={__selectedUsers}
                                    class={inputClass(false, 'primary', true, true, 'me-2', '')} />
                                
                                <span class="text-nowrap">{name}</span>
                            </li>
                        {/each}
                        </Dropdown>
                        
                    {#if teams.length}
                        <DropdownItem class="flex flex-row items-center justify-between gap-1 w-full">
                            Teams <AngleRightOutline size="md" />
                        </DropdownItem>
    
                        <Dropdown placement="right-start" class="py-0 w-fit">
                        {#each teams as {name, id}}
                            <li class="flex flex-row justify-left items-center text-left font-medium py-2 px-4 text-sm w-full">
                                <input type="checkbox" value={id} bind:group={__selectedTeams}
                                    class={inputClass(false, 'primary', true, true, 'me-2', '')} />

                                <span class="text-nowrap">{name}</span>
                            </li>
                        {/each}
                        </Dropdown>
                    {/if}
                    </Dropdown>
                </div>
    
            {#if target?.uId}
            {@const user = users.find(v => v.id === target.uId)}    
            {@const total = user.balance + ~~(activePrice.cost[mp]*quantity*(activePrice.type==='Wage' ? .8 : 1))}
    
                <div class="flex flex-row items-center font-semibold gap-2">
                    <p>Ending Balance:</p>
                    <p class={int2color(total)}>{int2cash(total)}</p>
                </div>
            {/if}
            </div>
    

            <div class="w-full flex flex-row justify-center">
                <Button color="primary" class="w-1/2 font-semibold text-md"
                    on:click={() => do_transaction()}
                >
                    Transact
                </Button>
            </div>
        </div>
    </Modal>
    {/if}
</div>