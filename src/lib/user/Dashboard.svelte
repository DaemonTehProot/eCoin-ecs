<script>
    import { onMount, getContext } from "svelte";
    import { int2cash, int2color } from "$lib/common/utils";

    import { ChevronRightOutline } from "flowbite-svelte-icons";
    import { Card, Heading, Tabs, TabItem, Dropdown, Radio } from "flowbite-svelte";


    /** @type {import("svelte/store").Writable<any>} */ const data = getContext('serverData');

//>======================================================<//

    $: teams = $data.teams;
    $: thisUser = $data.user[0];

    $: studentLead = [
        { desc: 'Highest Wealth', list: $data.leadWealth },
        { desc: 'Highest Earned', list: $data.leadEarned },
    ];

//>==============================================================<//
    
    function mapper(prices, mp)
    {
        const types = ['Wage', 'Purchase', 'Fine', 'Bid'];
        
        return types.map(t => [t,
            prices.filter(v => v.type===t).map(v => { return {...v, cost: v.cost[mp]} })
        ]);
    }

    let mpNow = $data.class[0].mp;
    $: mapped = mapper($data.prices, mpNow);
</script>


<div id="tab-Dashboard" class="space-y-4">
    <div class="flex flex-col md:flex-row w-full h-full gap-4">
        <div class="flex flex-col w-full md:w-3/5 gap-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card horizontal size="none" class="items-center justify-between h-fit">
                    <div class="w-full">
                        <p class="text-lg">Account Balance</p>
                        <p class="text-2xl font-bold leading-none">
                            <span class={int2color(thisUser.balance)}>{int2cash(thisUser.balance)}</span>
                        </p>
                    </div>
                </Card>
        
                <Card horizontal size="none" class="items-center justify-between h-fit">
                    <div class="w-full">
                        <p class="text-lg">Account Earnings</p>
                        <p class="text-2xl font-bold leading-none">
                            <span class={int2color(thisUser.earnings)}>{int2cash(thisUser.earnings)}</span>
                        </p>
                    </div>
                </Card>
            </div>
        
            <Card size="none" class="text-center pb-0 sm:pb-0 w-full h-fit">
    
                <div class="mb-3 flex items-center gap-2">
                    <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                        Class Leaderboards
                    </Heading>
                </div>
        
                <Tabs 
                    contentClass="mt-2 max-h-full"
                    defaultClass="flex divide-x rtl:divide-x-reverse divide-gray-200 dark:divide-gray-700 "
                >
                    <TabItem class="w-full" open>
                        <span slot="title" class="w-full md:text-base">Team Earnings</span>
                  
                        <ul class="divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
                            {#each teams as {name, balance}}
                            <li class="py-1.5">
                                <div class="flex items-center justify-between">
                                    <p class="truncate font-medium text-gray-900 dark:text-white">{name}</p>
        
                                    <div class="inline-flex items-center text-base">
                                        <p class="text-lg font-bold leading-none sm:text-xl">
                                            <span class={int2color(balance)}>{int2cash(balance)}</span>
                                        </p>
                                    </div>
                                </div>
                            </li>
                            {/each}
                        </ul>
                    </TabItem>
        
                    {#each studentLead as {desc, list}}
                        <TabItem class="w-full">
                            <span slot="title" class="w-full md:text-base">{desc}</span>
        
                            <ul class="divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
                                {#each list as {name, value}}
                                <li class="py-1.5">
                                    <div class="flex items-center justify-between">
                                        <p class="truncate font-medium text-gray-900 dark:text-white">{name}</p>
        
                                        <div class="inline-flex items-center text-base">
                                            <p class="text-lg font-bold leading-none sm:text-xl">
                                                <span class={int2color(value)}>{int2cash(value)}</span>
                                            </p>
                                        </div>
                                    </div>
                                </li>
                                {/each}
                            </ul>
                        </TabItem>
                    {/each}
                </Tabs>
            </Card>
        </div>

        <Card class="md:w-2/5 w-full h-fit
            overflow-y-auto pb-0 sm:pb-0 text-center" size="none"
        >
            <div class="mb-2 flex items-center justify-between">
                <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                    Current Prices
                </Heading>

                <button>
                    <p class="flex font-lg font-semibold hover:underline
                        hover:text-primary-600 hover:dark:text-primary-500"
                    > 
                        Week: {mpNow*5+1}-{mpNow*5+5}
                        <ChevronRightOutline size="lg"/>
                    </p>
                </button>

                <Dropdown class="w-fit p-3 text-md md:text-lg font-semibold">
                {#each [0,1,2,3,4,5,6,7] as idx}
                    <li class="pb-1.5">
                        <Radio name="mp-select" bind:group={mpNow} value={idx}>
                            Week: {idx*5+1}-{idx*5+5}
                        </Radio>
                    </li>
                {/each}
                </Dropdown>
            </div>

            <Tabs
                contentClass="mt-2 max-h-full"
                defaultClass="flex divide-x rtl:divide-x-reverse divide-gray-200 dark:divide-gray-700"
            >
                {#each mapped as [type, prices], idx}
                <TabItem class="w-full" open={!idx}>
                    <span slot="title" class="w-full text-sm">{type}s</span>
                
                    <ul class="font-semibold divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
                        {#each prices as {desc, cost}, idx}
                        <li class="py-2.5 gap-2">
                            <div class="flex justify-between items-center gap-6 w-full text-md font-medium">
                                <p class="text-black dark:text-white">{desc}</p>
                                <p class={int2color(cost)}>{int2cash(cost)}</p>
                            </div>
                        </li>
                        {:else}
                            <p class="my-1.5 text-center text-lg font-bold">Nothing to see here</p>
                        {/each}
                    </ul>
                </TabItem>
                {/each}
            </Tabs>
        </Card>
    </div>
</div>