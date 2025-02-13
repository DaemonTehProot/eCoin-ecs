<script>
    import { get } from "svelte/store";
    import { twMerge } from "tailwind-merge";
    
    import { onMount, getContext } from "svelte";
    import { inputClass } from "flowbite-svelte/Radio.svelte";

    import { int2cash, int2color, add_suffix, errorPopup } from "$lib/common/utils";
    import { send_add_generic, send_del_generic, send_set_generic } from "$lib/common/cmd";

    import { AngleRightOutline, TrashBinOutline, PlusOutline, EditOutline } from "flowbite-svelte-icons";
    import { Card, Heading, Tabs, TabItem, Modal, FloatingLabelInput, Dropdown, DropdownItem, Button, Radio, DropdownDivider } from "flowbite-svelte";

    /** @type {(s:string) => Promise<boolean>}           */ const confirmMsg  = getContext("confirmMsg");
    /** @type {import("svelte/store").Writable<any>}     */ const data        = getContext("serverData");
    /** @type {import("svelte/store").Writable<number>}  */ const activeClass = getContext("activeClass");
    /** @type {import("svelte/store").Writable<boolean>} */ const spinner     = getContext("spinner");


    $: curTeams = $data.teams.filter(v => v.cId === $activeClass);
    $: curUsers = $data.users.filter(v => v.cId === $activeClass);

    $: studentLead = [
        { desc: 'Highest Wealth', elm: 'balance', list: curUsers.toSorted((v1,v2) => v2.balance-v1.balance)   },
        { desc: 'Highest Earned', elm: 'earnings', list: curUsers.toSorted((v1,v2) => v2.earnings-v1.earnings) },
    ];


    let activeTeam = null;
    let activeTeamId = -1;

    onMount(() => { activeTeamId = curTeams[0]?.id ?? 0; })

    $: { 
        let t1 = curTeams.find(v => v.id===activeTeamId);
        if(!t1) { t1 = curTeams[0] ?? null; activeTeamId = t1?.id ?? -1; } 
    
        activeTeam = t1;
    }


    let in_state = null;
    
    let teamToRename = 0;
    let selectedUsers = [];

    $: grid_cols = (in_state==='delete') ? 'grid-cols-[1fr_4fr_1fr]' 
                                         : 'grid-cols-[1fr_4fr]';

//<-------------------------------------------------------->//

    async function delete_users()
    {
        if(selectedUsers.length) {
            if(await confirmMsg(`Remove ${selectedUsers.length} selected users?`))
                send_set_generic('users', selectedUsers, { tId: null }, spinner, data)
        }

        selectedUsers.length = 0;
    }

    async function add_users(ids)
    {
        send_set_generic('users', ids, { tId: activeTeamId }, spinner, data);
    }


    async function create_new_team()
    {
        const name = document.querySelector('input#team_name')?.value;
        if(!name.length) { errorPopup.set(`Please set somthing for name`); return; }

        spinner.set(true);

        await send_add_generic('teams', [{name, cId: get(activeClass)}], null, data);
        await send_set_generic('users', selectedUsers, { tId: curTeams.find(v=>v.name===name)?.id ?? null }, null, data);

        spinner.set(false);
        selectedUsers.length = 0;
    }

    async function delete_team(name, id)
    {
        if(!await confirmMsg(`Delete team ${name}?`)) return;

        await send_del_generic('teams', [[id]], spinner, data);
        activeTeamId = curTeams[0]?.id ?? -1;
    }

    const rename_team = (name) => { send_set_generic('teams', [teamToRename], {name}, spinner, data); }


    function shuffle_users(amount)
    {
        const rest = curUsers.filter(v => v.tId===null);
        const total = Math.min(~~(curUsers.length / amount) + (curUsers.length & 1), rest.length);

        selectedUsers = [...Array(rest.length)].map((a,i) => a=i)
                        .sort(() => Math.random()-.5).slice(0, total).map(v => rest[v].id);
    }

    /** @type {import('svelte/action').Action} */
    function reset_selected_action() { selectedUsers.length = 0; }
</script>

<div id="tab-Teams" class="flex flex-row gap-4 items-start">
    <Card class="text-center w-1/2 lg:w-3/5 h-fit overflow-y-auto" size="none">
        <div class="mb-3 flex items-center justify-between">
            <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold">
                <button class="w-fit h-fit p-1 gap-1 flex flex-row items-center underline-offset-[6px]
                    hover:text-primary-600 dark:hover:text-primary-500 hover:underline"
                >
                    {activeTeam?.name ?? '(none)'}
                    <AngleRightOutline size="lg" />
                </button>

                <Dropdown placement="right-start" class="p-3" classFooter="py-0">
                {#each curTeams as {name, id}}

                    <div class="w-full h-fit flex flex-row items-center justify-between">
                    {#if teamToRename !== id}
                        <Radio class="p-1 mr-2 flex items-center text-base" bind:group={activeTeamId} value={id}>
                            <p class={activeTeamId===id ? 'text-primary-600 dark:text-primary-500' : ''}>
                                {name}
                            </p>
                        </Radio>
                    {:else}
                        <FloatingLabelInput autofocus value={name} 
                            classInput="font-semibold" on:change={(e) => rename_team(e.target?.value) } />
                    {/if}
                        <div class="flex flex-row items-center">
                            <button class={twMerge(`w-fit h-fit p-1 hover:text-green-600 dark:hover:text-green-500
                                rounded-full outline-2`, (teamToRename===id) && 'text-green-600 dark:text-green-500 outline')}
                                on:click={() => { teamToRename = (teamToRename===id) ? 0 : id; }}
                            >
                                <EditOutline size="md" />
                            </button>
                            
                            <button class="w-fit h-fit p-1 hover:text-red-700 dark:hover:text-red-600"
                                on:click={() => delete_team(name, id)}
                            >
                                <TrashBinOutline size="md" />
                            </button>
                        </div>
                    </div>
                {/each}
                    <DropdownItem class="pb-2 w-full h-full" slot="footer">
                        <button class="w-full h-full text-base text-center"
                            on:click={() => { in_state="create"; }}
                        > 
                            + Add New Team
                        </button>
                    </DropdownItem>
                </Dropdown>
            </Heading>

            <div class="flex flex-row items-center gap-2" use:reset_selected_action>
                <button class="w-fit h-fit p-1 hover:text-green-600 dark:hover:text-green-500">
                    <PlusOutline size="lg" />
                </button>

                <Dropdown placement="bottom-start" class="py-0 overflow-hidden w-fit">
                {@const valid = curUsers.filter(v => v.tId===null)}

                {#each valid as {name, id}}
                    <li class="flex flex-row justify-left items-center text-left font-medium py-2 px-4 text-sm">
                        <input type="checkbox" value={id} bind:group={selectedUsers}
                            class={inputClass(false, 'primary', true, true, 'me-2', '')}/>
                        
                        <span class="text-nowrap">{name}</span>
                    </li>
                {/each}
                {#if valid.length}
                    <DropdownDivider class="mb-0" />
                    <DropdownItem class="text-center hover:text-primary-600 dark:hover:text-primary-500 hover:underline"
                        on:click={() => add_users(selectedUsers)}>
                        Add
                    </DropdownItem>
                {:else}
                    <DropdownItem class="text-center">(none)</DropdownItem>
                {/if}
                </Dropdown>
    
                <button class={twMerge(`w-fit h-fit p-1 rounded-full outline-3 outline-red-700 dark:outline-red-600
                    hover:text-red-700 dark:hover:text-red-600`, (in_state==='delete') && 'outline text-red-700 dark:text-red-600')}
                    on:click={async () => {(in_state==='delete') && await delete_users(); in_state = (in_state==='delete') ? null : 'delete'; }}
                >
                    <TrashBinOutline size="lg" />
                </button>
            </div>
        </div>

        <div class={twMerge(`grid font-bold text-lg text-center py-1 
            border-b border-gray-200 dark:border-gray-700`, grid_cols)}
        >
            <p>Rank</p> <p>Name</p>
        </div>
    
    {#if activeTeam}
    {@const ranked = 
        curUsers.filter(v => v.tId===activeTeam.id).sort((a,b) => b.earnings-a.earnings)
    }
        <ul class="font-semibold divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
        {#each ranked as {id, name}, idx}
        
            <li class="font-semibold text-center text-md w-full h-fit">
                <button class={twMerge(`grid py-1 w-full h-full items-center`, grid_cols)}>
                    <p>{add_suffix(idx+1)}</p>
                    <p>{name}</p>

                    {#if in_state==="delete"}
                        <input type="checkbox" value={id} bind:group={selectedUsers} 
                            class={inputClass(false, 'red', true, true, 'me-2', '')}
                            use:reset_selected_action
                        />
                    {/if}
                </button>
            </li>
        {/each}
        </ul>
    {/if}
    </Card>


    <Card class="text-center w-1/2 lg:w-2/5 h-fit overflow-y-auto" size="none">
        <div class="mb-3">
            <div class="mb-3 flex items-center justify-between">
                <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                    Class Leaderboards
                </Heading>
            </div>
        </div>

        <Tabs
            contentClass="mt-2 max-h-full"
            defaultClass="flex divide-x rtl:divide-w-reverse divide-gray-200 dark:divide-gray-700"
        >
            <TabItem open class="w-full" defaultClass="inline-block text-sm 
                font-semibold text-center disabled:cursor-not-allowed w-full"
            >
                <span slot="title" class="w-full md:text-base">Team Earnings</span>

                <ul class="divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
                {#each curTeams as {name, balance}}
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

            {#each studentLead as {desc, elm, list}}
            <TabItem class="w-full" defaultClass="inline-block text-sm 
                font-semibold text-center disabled:cursor-not-allowed w-full"
            >
                <span slot="title" class="w-full md:text-base">{desc}</span>

                <ul class="divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
                {#each list as entry}
                    <li class="py-1.5">
                        <div class="flex items-center justify-between">
                            <p class="truncate font-medium text-gray-900 dark:text-white">{entry.name}</p>

                            <div class="inline-flex items-center text-base">
                                <p class="text-lg font-bold leading-none sm:text-xl">
                                    <span class={int2color(entry[elm])}>{int2cash(entry[elm])}</span>
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

    {#if in_state==="create"}
    <Modal open size="xs" classBody="space-y-0" 
        on:close={() => in_state==='create' && (in_state=null)}
    >
        <div class="flex flex-col w-full gap-y-6">
            <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">
                Create A New Team
            </h3>

            <FloatingLabelInput classInput="font-semibold" id="team_name">Team name</FloatingLabelInput>

            <div class="flex flex-row items-center font-semibold gap-1" use:reset_selected_action>
                Members:
                
                <button class="w-fit h-fit p-1 flex flex-row underline-offset-[6px]
                    hover:text-primary-600 dark:hover:text-primary-500 hover:underline"
                >
                    {`${selectedUsers.length} selected`}
                    <AngleRightOutline size="lg" />
                </button>

                <Dropdown placement="right-start" class="py-0">
                    <DropdownItem class="flex flex-row items-center" on:click={() => shuffle_users(2)}>
                        Shuffle
                    </DropdownItem>

                    <DropdownItem class="flex flex-row items-center">
                        Manual
                        <AngleRightOutline size="md" />
                    </DropdownItem>

                    <Dropdown placement="right-start" class="py-0 overflow-hidden w-fit">
                    {#each curUsers.filter(v => v.tId===null) as {name, id}}
                        <li class="flex flex-row justify-left items-center text-left font-medium py-2 px-4 text-sm w-full">
                            <input type="checkbox" value={id} bind:group={selectedUsers}
                                class={inputClass(false, 'primary', true, true, 'me-2', '')}
                            />
                            
                            <span class="text-nowrap">{name}</span>
                        </li>
                    {:else}
                        <DropdownItem class="text-center">(none)</DropdownItem>
                    {/each}
                    </Dropdown>
                </Dropdown>
            </div>

            <div class="w-full flex flex-row justify-center">
                <Button color="primary" class="w-1/2 font-semibold text-md"
                    on:click={() => create_new_team()}
                >
                    Create
                </Button>
            </div>
        </div>
    </Modal>
    {/if}
</div>