<script>
    import { getContext } from "svelte";
    import { object_map, int2cash } from "$lib/common/utils";

    import { SearchOutline, UndoOutline } from "flowbite-svelte-icons";
    import { Card, Tabs, TabItem, Heading, Input, Button, ButtonGroup, InputAddon } from "flowbite-svelte";


    /** @type {import("svelte/store").Writable<any>} */ const data = getContext('serverData');
        

    $: logs = $data.logs;
    $: placed = $data.placedBids;

    $: balance = $data.user[0].balance;
    
    let value = "";
    let inputActive = false;

    
    const lTypes = ['date', 'desc', 'type', 'notes', 'total'];
    const rStr = "<span class=\"bg-cyan-300 text-black px-[1px]\">$&</span>"

    function filter_logs(logs, filter)
    {
        if(filter.length == 0) return map_logs(logs);

        const regex = new RegExp(filter.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&'), "i");
        const filted = map_logs(logs).filter(v1 => lTypes.some(v2 => v1[v2].match(regex)));

        return filted.map(v => object_map(v, (k,v) => lTypes.includes(k) ? v.replace(regex, rStr) : v));
    }

    function map_logs(logs) {
        return logs.map(({date, old, total, ...rest}) => {
            return {
                ...rest, date: date.split(' ')[0],
                old: int2cash(old), total: int2cash(total) 
            };
        }).reverse();
    }
</script>   

<div id="tab-Activity" class="flex justify-center space-y-4">

    <Card class="text-center w-full h-fit overflow-y-auto pb-0 sm:pb-0 sm:max-w-[80%] lg:max-w-[70%]" size="none">
        <div class="mb-3 flex items-center justify-between">
            <div class="hidden md:contents">
                <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                    Recent Activity
                </Heading>
    
                <div class="w-1/3">
                    <Input id="log-search" bind:value placeholder="Search" size="md" class="bg-gray-100 font-semibold">
                        <SearchOutline slot="left" class="w-6 h-6 text-gray-500 dark:text-gray-400" />
                    </Input>
                </div>
            </div>

            <div class="contents md:hidden">
            {#if !inputActive}    
                <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                    Recent Activity
                </Heading>

                <button on:click={() => inputActive = true}>
                    <SearchOutline class="hover:text-primary-600 dark:hover:text-primary-500 w-7 h-7" />
                </button>
            {:else}
                <ButtonGroup class="w-3/4" size="md">
                    <InputAddon>
                        <SearchOutline class="w-6 h-6 text-gray-600 dark:text-gray-300" />
                    </InputAddon>
                    <Input id="log-search" bind:value placeholder="Search" class="bg-gray-100 font-semibold" /> 
                    <Button color="red" on:click={() => { inputActive=false; value=""; }}>
                        <UndoOutline class="w-7 h-7 text-black" />
                    </Button>
                </ButtonGroup>
            {/if}
            </div>
        </div>

        <Tabs
            defaultClass="flex w-fit"
            contentClass="mt-2 max-h-full border-none"

            activeClasses="pb-4 pr-4 text-primary-600 dark:text-primary-500 underline underline-offset-4"
            inactiveClasses="pb-4 pr-4 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
            <TabItem class="w-full" open>
                <span slot="title" class="w-full md:text-base">Transactions</span>
                
                <div class="hidden md:grid grid-cols-[4fr_1fr] font-bold text-base border-b border-gray-200 dark:border-gray-700 py-1">
                    <div class="grid grid-cols-[1fr_3fr] text-left">
                        <p>Date</p>
                        
                        <div class="grid grid-cols-1 lg:grid-cols-2">
                            <p>Description</p>
                            <p class="hidden lg:block">Notes</p>
                        </div>
                    </div>
                    
                    <p class="text-right">Balance</p>
                </div>

                <ul class="font-semibold divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
                    {#each filter_logs(logs, value) as {date, desc, type, notes, old, total}}
                        <li class="py-2 grid grid-cols-[4fr_1fr] items-center w-full h-fit">

                            <div class="grid grid-cols-1 md:grid-cols-[1fr_3fr] text-left">
                                <p class="text-xs sm:text-base font-medium pr-4">{@html date}</p>

                                <div class="grid grid-cols-1 lg:grid-cols-2">
                                    <div class="flex flex-col w-full">
                                        <p class="text-base font-medium text-black dark:text-white">{@html desc}</p>
                                        <p class="text-xs">{@html type}</p>
                                    </div>

                                    <p class="hidden lg:block text-base font-medium text-black dark:text-white">{@html notes}</p>
                                </div>
                            </div>

                            <div class="flex flex-col text-right">
                                <p class="text-xs sm:hidden">&nbsp;</p>
                                <p class={total[0]=="-" ? 'text-red-500' : 'text-green-500'}>{@html total}</p>
                                <p class="text-xs sm:text-sm">{@html old}</p>
                            </div>
                        </li>
                    {:else}
                        <p class="my-1.5 text-center text-lg font-bold">No Transactions Now</p>
                    {/each}
                </ul>
            </TabItem>

            <TabItem class="w-full">
                <span slot="title" class="w-full md:text-base">Pending</span>

                <div class="hidden md:grid grid-cols-[4fr_1fr] font-bold text-base border-b border-gray-200 dark:border-gray-700 py-1">
                    <p class="text-left">Desctiption</p>
                    <p class="text-right">Amount</p>
                </div>

                <ul class="font-semibold divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
                    {#each placed as {bId, amount}}
                    {@const item = $data.activeBids.find(v => v.id === bId)}

                        <li class="py-2 grid grid-cols-[4fr_1fr] items-center w-full h-fit">
                            <p class="text-left text-base font-medium text-black dark:text-white">{item.desc}</p>
                            
                            <div class="flex flex-col text-right">
                                <p class="text-red-500">{int2cash(-amount)}</p>
                                <p class="text-xs sm:text-sm">{int2cash(balance-amount)}</p>
                            </div>
                        </li>
                    {:else}
                        <p class="my-3 text-center text-lg font-bold">No Bids Pending Now</p>
                    {/each}
                </ul>
            </TabItem>
        </Tabs>
    </Card>
</div>