<script>
// @ts-nocheck

    import { twMerge } from 'tailwind-merge';
    import { refetch_server } from '$lib/common/cmd';

    import { onMount, getContext } from "svelte";
    import { int2color, int2cash, errorPopup } from "$lib/common/utils";

    import { Card, Tabs, TabItem, Heading, Button, Input } from "flowbite-svelte";
    import { AngleLeftOutline, PlusOutline, MinusOutline } from "flowbite-svelte-icons";


    /** @type {import("svelte/store").Writable<any>} */ const data = getContext('serverData');
    /** @type {import("svelte/store").Writable<boolean> }*/ const spinner = getContext('spinner');

//>====================================================================================<//

    let bidIdx = -1;
    let priceIdx = -1;

    let logLength = $data.logs.length;
    
    data.subscribe((v) => { 
        if(v.logs.length !== logLength) 
        {
            priceIdx = bidIdx = -1;
            logLength = v.logs.length;
        }
    });
    
//>================================================<//

    const mapper = (prices, mp) => 
        prices.filter(v => v.type === 'Purchase').map(v => { return {...v, cost: v.cost[mp]} });

    $: thisMp = $data.class[0].mp;

    $: bids = $data.activeBids;
    $: prices = mapper($data.prices, thisMp);

//>================================================================<//

    let quantity = 1;
    $: balance = $data.user[0].balance;

    function toggle_bid(idx) 
    { 
        bidIdx = (bidIdx===idx) ? -1 : idx;
        quantity = -(+bids.find(v => v.id===idx).amount);
    }
    
    function toggle_purchase(idx) 
    {
        quantity = 1;
        priceIdx = (priceIdx===idx) ? -1 : idx;
    }

    function move_quant(dir, max) { quantity = Math.min(max, Math.max(1, quantity + dir)); }


    function amount_change({ target }) 
    { 
        quantity = Math.floor(+(target.value) * 100);
    }

//>===========================================================================<//

    async function trans_generic(path, body) 
    {
        spinner.set(true);
        const res = await fetch(path, { body: JSON.stringify(body), method: 'POST' });

        spinner.set(false);
        if(!res.ok) return errorPopup.set(`Error: ${(await res.json()).message}`);
        
        priceIdx = bidIdx = -1;
        refetch_server('user-team-leadWealth-leadEarned-logs', '/user', data);
    }


    const trans_bid = (bId, amount) => trans_generic('/user/api/bid', {bId, amount});
    const trans_purchase = (pId, amount) => trans_generic('/user/api/trans', {pId, amount});
</script>

<div id="tab-Store" class="flex justify-evenly gap-4">


    <Card class="sm:max-w-[80%] lg:max-w-[60%] w-full h-fit
        overflow-y-auto pb-0 sm:pb-0 text-center" size="none"
    >

    {#if priceIdx >= 0}

    {@const item = prices.find(v => v.id === priceIdx)}
    {@const avail = (item.cost > 0) ? Infinity : Math.max(Math.trunc(balance / -item.cost), 0)}

        <div class="mb-3">
            <div class="flex items-center gap-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <AngleLeftOutline withEvents on:click={() => priceIdx = -1} size="lg" class="
                    text-black dark:text-white hover:text-primary-600 dark:hover:text-primary-500" />

                <p class="text-black dark:text-white text-lg md:text-xl font-medium">{item.desc}</p>
            </div>

            <div class="pt-3">
                <div class="mb-4 flex justify-between items-center">
                    <div class="flex flex-col text-left">
                        <p class="text-base font-medium text-black dark:text-white">Quantity:</p>
                        <p class="text-xs font-medium">Maximum: {avail}</p>
                    </div>

                    <div class="grid grid-cols-3 border rounded divide-x 
                        border-gray-200 dark:border-gray-700 divide-gray-200 dark:divide-gray-700"
                    >
                        <button on:click={() => move_quant(+1, avail)} class="p-1">
                            <PlusOutline size="lg" class="pt-px md:hover:text-primary-500 dark:md:hover:text-primary-600"/>
                        </button>

                        <div class="flex items-center justify-center font-medium">{quantity}</div>

                        <button on:click={() => move_quant(-1, avail)} class="p-1">
                            <MinusOutline size="lg" class="pt-px md:hover:text-primary-500 dark:md:hover:text-primary-600" />
                        </button>
                    </div>
                </div>

                <div class="flex justify-between">
                    <p class="text-base font-medium text-black dark:text-white">Subtotal:</p>
                    <p class={`${int2color(item.cost)} font-semibold`}>{int2cash(item.cost)}</p>
                </div>

                <div class="flex justify-between mb-3">
                    <p class="text-base font-medium text-black dark:text-white">Total:</p>
                    <p class={`${int2color(item.cost)} font-semibold`}>{int2cash(item.cost * quantity)}</p>
                </div>

                <div class="flex justify-between mb-3">
                    <p class="text-base font-medium text-black dark:text-white">End balance:</p>
                    <p class={`${int2color(balance + (item.cost*quantity))} font-semibold`}>{int2cash(balance + (item.cost*quantity))}</p>
                </div>

                <div class="w-full h-fit flex justify-center">
                    <Button on:click={() => trans_purchase(item.id, quantity)} class="w-1/2 outline-none">Purchase</Button>
                </div>
            </div>
        </div>
    {:else if bidIdx >= 0}
    {@const {id, desc, amount} = bids.find(v => v.id === bidIdx)}

        <div class="mb-3">
            <div class="flex items-center gap-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <AngleLeftOutline withEvents on:click={() => bidIdx = -1} size="lg" class="
                    text-black dark:text-white hover:text-primary-500 dark:hover:text-primary-600" />

                <p class="text-black dark:text-white text-lg md:text-xl font-medium">{desc}</p>
            </div>

            <div class="pt-3">
                <div class="mb-4 flex justify-between items-center">
                    <div class="flex flex-col text-left">
                        <p class="text-base font-medium text-black dark:text-white">Amount:</p>
                        <p class="text-xs font-medium">Minimum: {int2cash(-amount)}</p>
                    </div>

                    <div>
                        <Input on:input={amount_change} value={(-amount*.01).toFixed(2)}/>
                    </div>
                </div>

                <div class="flex justify-between mb-3">
                    <p class="text-base font-medium text-black dark:text-white">End balance:</p>
                    <p class={`${int2color(balance-quantity)} font-semibold`}>{int2cash(balance-quantity)}</p>
                </div>

                <div class="flex justify-between mb-3">
                    <p class="text-base font-medium text-black dark:text-white">Required Funds:</p>
                    <p class={`${int2color(Math.max(0, quantity-balance))} font-semibold`}>{int2cash(Math.max(0, quantity-balance))}</p>
                </div>

                <div class="w-full h-fit flex justify-center">
                    <Button on:click={() => trans_bid(id, quantity)} class="w-1/2 outline-none">Place Bid</Button>
                </div>
            </div>
        </div>
    {:else}
        <div class="mb-3 flex items-center justify-between">
            <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                Store Prices
            </Heading>
        </div>

        <Tabs
            defaultClass="flex w-fit"
            contentClass="mt-2 max-h-full"
            
            activeClasses="pb-4 pr-4 text-primary-600 dark:text-primary-500 underline underline-offset-4"
            inactiveClasses="pb-4 pr-4 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
            <TabItem class="w-full" open>
                <span slot="title" class="w-full md:text-base">Purchases</span>
            
                <ul class="font-semibold divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
                    {#each prices as {id, desc, cost}, idx}
                    {@const avail = Math.max(Math.trunc(balance / (-cost)), 0)}

                    <li class="py-1.5 gap-2">
                        <button class={twMerge("w-full h-full", avail || "cursor-auto")} 
                            on:click|preventDefault={() => avail && toggle_purchase(id)}
                        >
                            <div class="flex justify-between items-center gap-6 w-full text-md font-medium">
                                <p class={avail ? "text-black dark:text-white" : ''}>{desc}</p>

                                <div class="flex items-center gap-1">
                                    <div class="flex flex-col text-right font-bold">
                                        <p class={int2color(cost)}>{int2cash(cost)}</p>
                                        <p class="text-xs font-medium">Available: {avail}</p>
                                    </div>
                                </div>
                            </div>                        
                        </button>
                    </li>
                    {:else}
                        <p class="my-1.5 text-center text-lg font-bold">Nothing to see here</p>
                    {/each}
                </ul>
            </TabItem>

            <TabItem class="w-full">
                <span slot="title" class="w-full md:text-base">Bids</span>
            
                <ul class="font-semibold divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
                    {#each bids as {id, desc, amount}, idx}

                    <li class="py-1.5 gap-2">
                        <button class="w-full h-fit" on:click|preventDefault={() => toggle_bid(id)}>
                            <div class="flex justify-between items-center gap-6 w-full text-md font-medium pb-1">
                                <p class="text-black dark:text-white">{desc}</p>
                                <p class={`${int2color(amount)} font-bold`}>{int2cash(amount)}</p>
                            </div>
                        </button>
                    </li>
                    {:else}
                        <p class="my-1.5 text-center text-lg font-bold">Nothing to see here</p>
                    {/each}
                </ul>
            </TabItem>
        </Tabs>
    {/if}
    </Card>
</div>