<script>
    import { twMerge } from "tailwind-merge";
    
    import { getContext } from "svelte";
    import { inputClass } from "flowbite-svelte/Radio.svelte";

    import { int2cash, int2color, add_suffix, object_map, errorPopup } from "$lib/common/utils";
    import { initString, refetch_server, send_add_generic, send_del_generic, send_set_generic, gen_get_args } from "$lib/common/cmd";

    import { Button, Card, Dropdown, DropdownItem, Input, FloatingLabelInput, Heading, Modal, Spinner, ButtonGroup, InputAddon, DropdownDivider } from "flowbite-svelte";
    import { AngleLeftOutline, AngleRightOutline, TrashBinOutline, PlusOutline, EditOutline, SearchOutline, UndoOutline, LockOutline, FileExportOutline } from "flowbite-svelte-icons";

    /** @type {(s:string) => Promise<boolean>}           */ const confirmMsg  = getContext("confirmMsg");
    /** @type {import("svelte/store").Writable<any>}     */ const data        = getContext("serverData");
    /** @type {import("svelte/store").Writable<number>}  */ const activeClass = getContext("activeClass");
    /** @type {import("svelte/store").Writable<boolean>} */ const spinner     = getContext("spinner");
    

    $: teams = $data.teams;
    $: users = $data.users;
    $: classes = $data.classes;


    let in_state = null;
    let activeUser = null;

    let selectedTeam = null;

    let userLogs = [];
    let logPromise = null;
    
    let value = "";
    let inputActive = false;

    let activeTid = null;
    
    // Intentional reference to users and activeUser
    
    $: { activeUser = users.find(v => v.id===activeUser?.id) ?? null; }
    $: { in_state = activeUser ? null : null; }

    $: grid_cols = (in_state==='delete') ? `grid-cols-[15fr_8fr_8fr_15fr_10fr_2fr]` 
                                : `grid-cols-[15fr_8fr_8fr_15fr_10fr]`;

    const nameSortFn = (a,b) => a.name.localeCompare(b.name);
    
//<----------------------------------------------------------------------->//

    let selected = [];
    async function delete_selected()
    {
        if(selected.length) {
            if(await confirmMsg(`Delete ${selected.length} selected users?`))
                send_del_generic('users', [selected], spinner, data)
        }

        selected.length = 0;
    }

    async function delete_single()
    {
        if(await confirmMsg(`Delete user ${activeUser.name}?`))
            send_del_generic('users', [[activeUser.id]], spinner, data).then(() => activeUser=null);
    }

//>--------------------------------------------------------------<//

    function create_new_user()
    {
        const fname = document.querySelector('input#user_fname')?.value.trim().split(' ')[0];
        const lname = document.querySelector('input#user_lname')?.value.trim().split(' ')[0];

        const name = `${fname} ${lname}`.trimStart();
        const pass = document.querySelector('input#user_passwd')?.value;

        if(!name.length) { errorPopup.set("Please set a first or last name"); return; }
        if(!pass.length) { errorPopup.set("Please set something for password"); return; }

        send_add_generic('users', [{name, pass, tId: selectedTeam?.id ?? null, cId: $activeClass}], spinner, data);
    }
    
    async function edit_user()
    {
        const name = document.querySelector('#user_name')?.value;
        if(!name.length) { errorPopup.set("Name of the user cannot be blank"); }

        send_set_generic('users', [activeUser.id], { name, tId: activeTid }, spinner, data);
    }

    async function change_passwd()
    {
        const pass = document.querySelector('#passwd_box')?.value;
        if(pass.length && await confirmMsg(`Change ${activeUser.name}'s password to "${pass}"?`)) 
        {
            const body = JSON.stringify({ id: activeUser.id, pass });
            
            spinner.set(true);
            const res = await fetch('/admin/api/passwd', { body, method: 'POST' });

            spinner.set(false);
            if(!res.ok) errorPopup.set(`Error: ${(await res.json()).message}`);
        }
    }

    async function swap_class(cId)
    {
        const uId = activeUser.id;
        const cName = classes.find(v => v.id === cId).name;

        if(await confirmMsg(`Send ${activeUser.name} to ${cName}?`)) 
        {
            let jobs = [];
            spinner.set(true);
            
            const purchases = $data.purchases.filter(v => v.uId === uId).map(v => v.id);
            const placedBids = $data.placedBids.filter(v => v.uId === uId).map(v => v.id);

            jobs.push(send_set_generic('users',      [uId],     { tId: null, cId }, null, data));
            jobs.push(send_set_generic('purchases',  purchases,            { cId }, null, data));
            jobs.push(send_del_generic('placedBids', [placedBids],                  null, data));

            await Promise.allSettled(jobs);
            spinner.set(false);

            activeUser = null;
        }
    }

    async function undo_log(id) 
    {
        if(await confirmMsg(`Undo selected transaction?`))
        {
            const body = JSON.stringify({ id });

            spinner.set(true);
            const res = await fetch('/admin/api/undo', { body, method: 'POST' });

            spinner.set(false);
            if(!res.ok) errorPopup.set(`Error: ${(await res.json()).message}`);

            refetch_server(initString, '/admin', data);
            server_log_action(document.body, undefined);
        }
    }

    /** @type {import('svelte/action').Action} */
    function reset_tId_action() { activeTid = activeUser.tId; }

//>---------------------------------------------------<//

    /** @type {import('svelte/action').Action} */
    async function server_log_action()
    {
        const { promise, resolve, reject } = Promise.withResolvers();
        if(!userLogs.length) logPromise = promise;
        
        const arg = gen_get_args('logs', { logs: userLogs });
        const res = await fetch('/admin/api/get', { body: JSON.stringify(arg), method: 'POST'});
        
        if(res.ok) {
            const { logs } = await res.json();
            if(logs) userLogs = userLogs.concat(logs.data);
        } 
        
        // @ts-expect-error
        (res.ok) ? resolve() : reject(); 
    }


    const lTypes = ['date', 'desc', 'type', 'notes', 'total', 'old'];
    const rStr = "<span class=\"bg-cyan-300 text-black px-[1px]\">$&</span>"

    function filter_logs(logs, filter)
    {
        if(filter.length == 0) return map_logs(logs);

        const regex = new RegExp(filter.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&'), "i");
        const filted = map_logs(logs).filter(v1 => lTypes.some(v2 => v1[v2].match(regex)));

        let _tmp = filted.map(v => object_map(v, (k,v) => lTypes.includes(k) ? v.replace(regex, rStr) : v));

        console.log(_tmp);
        return _tmp;
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

<div id="tab-Users" class="space-y-4 flex flex-col items-center">
    
    <Card class="text-center w-full h-fit overflow-y-auto" size="none">
    {#if !activeUser}
        <div class="mb-3 flex flex-row items-center justify-between">
            
            <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                User List
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
                    on:click={async () => {(in_state==='delete') && await delete_selected(); in_state = (in_state==='delete') ? null : 'delete'; }}
                >
                    <TrashBinOutline size="lg" />
                </button>
            </div>
        </div>


        <div class={twMerge(`grid font-bold text-lg text-center py-1 
            border-b border-gray-200 dark:border-gray-700`, grid_cols)}
        >
            <p>Name</p> <p>Balance</p> 
            <p>Earnings</p> <p>Team</p> <p>Updated</p>
        </div>

        <ul class="font-semibold divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-800">
            {#each $data.users.filter(v => v.cId===$activeClass).sort(nameSortFn) as user}
            {@const { id, tId, name, balance, earnings, updated } = user}

            {@const tName = teams.find(v => v.id===tId)?.name ?? '(none)'}

            <li class="font-semibold text-center text-md w-full h-fit hover:bg-gray-100 dark:hover:bg-gray-700">
                <button class={twMerge(`grid py-1 w-full h-full items-center`, grid_cols)}
                    on:click={() => !in_state && (activeUser = user)}
                >
                    <!--p>{id}</p-->
                    <p>{name}</p>
    
                    <p class={int2color(balance)}>{int2cash(balance)}</p>
                    <p class={int2color(earnings)}>{int2cash(earnings)}</p>
    
                    <p>{tName}</p>
                    <p>{new Date(updated).toLocaleDateString()}</p>

                    {#if (in_state==='delete')}
                        <input type="checkbox" value={id} bind:group={selected} 
                            class={inputClass(false, 'red', true, true, 'me-2', '')}
                        />
                    {/if}
                </button>
            </li>
            {/each}
        </ul>
    {:else}
        {@const { id, cId, tId, name, balance, earnings, updated } = activeUser}
       
        {@const tName = teams.find(v => v.id===tId)?.name ?? '(none)'}
        {@const cName = classes.find(v => v.id===cId)?.name ?? '(none)'}

        {@const rankTeam = users.filter(v => v.tId===tId).sort((a,b) => b.earnings-a.earnings).findIndex(v => v.id===id)}
        {@const rankClass = users.filter(v => v.cId===cId).sort((a,b) => b.earnings-a.earnings).findIndex(v => v.id===id)}

        <div class="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
            <div class="flex flex-row gap-2">
                <button class="w-fit h-fit p-1 text-black dark:text-white hover:text-primary-600 dark:hover:text-primary-500" 
                    on:click={() => activeUser = null}
                >
                    <AngleLeftOutline size="lg" />
                </button>
    
                <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                {#if in_state==="modify"}
                    <FloatingLabelInput id="user_name" value={name} class="font-2xl" />
                {:else}
                    {name}
                {/if}
                </Heading>
            </div>

            <div class="gap-2 flex flex-row justify-between items-center w-fit">
                <button class={twMerge(`w-fit h-fit p-1 outline-3 rounded-full outline-green-600 dark:outline-green-500 
                    hover:text-green-600 dark:hover:text-green-500`, (in_state==="undo") && 'outline text-green-600 dark:text-green-500')}
                    on:click={async () => {in_state = (in_state==="undo") ? null : "undo"}}
                >
                    <UndoOutline size="lg" />
                </button>

            {#if in_state==="passwd"}
                <FloatingLabelInput id="passwd_box" autofocus class="font-xl" style='filled'
                    on:change={() => change_passwd()} on:blur={() => in_state=null}>Password</FloatingLabelInput>
            {:else}
                <button class="w-fit h-fit p-1 hover:text-green-600 dark:hover:text-green-500" on:click={() => in_state = "passwd"}>
                    <LockOutline size="lg" />
                </button>
            {/if}

                <button class={twMerge(`w-fit h-fit p-1 outline-3 rounded-full outline-green-600 dark:outline-green-500 
                    hover:text-green-600 dark:hover:text-green-500`, (in_state==="modify") && 'outline text-green-600 dark:text-green-500')}
                    on:click={async () => {(in_state==="modify") && await edit_user(); in_state = (in_state==="modify") ? null : "modify"}}
                >
                    <EditOutline size="lg" />
                </button>
                
                <button class="w-fit h-fit p-1 hover:text-red-700 dark:hover:text-red-600" on:click={() => delete_single()}>
                    <TrashBinOutline size="lg" />
                </button>

                <button class="w-fit h-fit p-1 hover:text-green-600 dark:hover:text-green-500">
                    <FileExportOutline size="lg" />
                </button>

                <Dropdown placement="left-start" class="py-0" classFooter="py-0">
                {#each classes.filter(v => v.id !== $activeClass) as { id, name }}
                    <DropdownItem class="text-center" 
                        on:click={() => swap_class(id)}
                    >
                        {name}
                    </DropdownItem>
                {:else}
                    <DropdownItem class="text-center">
                        (none)
                    </DropdownItem>
                {/each}
                </Dropdown>
            </div>
        </div>

        <div class="w-full h-full flex flex-row divide-x divide-gray-200 dark:divide-gray-700">
            <div class="max-w-[20%] min-w-fit w-full h-full pt-3 pr-3 text-left text-xl font-semibold gap-y-4">
                <div class="flex flex-row gap-x-3">
                    <div class="text-primary-600 dark:text-primary-500">
                        <p>Balance:</p>
                        <p>Earnings:</p>
                    </div>
                    <div>
                        <p class={int2color(balance)}>{int2cash(balance)}</p>
                        <p class={int2color(earnings)}>{int2cash(earnings)}</p>
                    </div>
                </div> <br/>

                <div class="flex flex-row gap-x-3">
                    <p class="text-primary-600 dark:text-primary-500">Team:</p> 
                    
                {#if in_state==='modify'}
                    <button class="w-fit h-fit p-1 -mt-1 -ml-1 gap-1 flex flex-row items-center 
                        underline-offset-[6px] hover:text-primary-600 dark:hover:text-primary-500 hover:underline"
                        use:reset_tId_action
                    >
                        {teams.find(v => v.id===activeTid)?.name ?? '(none)'}
                        <AngleRightOutline size="md" />
                    </button>
                    
                    <Dropdown class="py-0 text-center" placement="right-start">
                    {#each teams as {id, name}}
                        <DropdownItem class={twMerge("text-center hover:text-primary-600 dark:hover:text-primary-500", 
                            activeTid===id && 'text-primary-600 dark:text-primary-500')} on:click={() => activeTid=id}
                        >
                            {name}
                        </DropdownItem>
                    {/each}
                    {#if teams.length}
                        <DropdownDivider />
                    {/if}
                        <DropdownItem class="text-center" on:click={() => activeTid=null}>
                            (none)
                        </DropdownItem>
                    </Dropdown>     
                {:else}
                    <p>{tName}</p>
                {/if}
                </div> <br/>

                <div class="flex flex-row gap-x-3">
                    <div class="text-primary-600 dark:text-primary-500">
                        <p>Class Rank:</p>
                        <p>Team Rank:</p>
                    </div>
                    <div>
                        <p>{add_suffix(rankClass+1)}</p>
                        <p>{tId===null ? '(none)' : add_suffix(rankTeam+1)}</p>
                    </div>
                </div>
            </div>
        

            <div class="pt-3 w-full" use:server_log_action>
                <div class="mb-3 pl-3 flex items-center justify-between">
                    <div class="hidden lg:contents">
                        <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                            Activity
                        </Heading>
            
                        <div class="w-1/3">
                            <Input id="log-search" bind:value placeholder="Search" size="md" class="bg-gray-100 font-semibold">
                                <SearchOutline slot="left" class="w-6 h-6 text-gray-500 dark:text-gray-400" />
                            </Input>
                        </div>
                    </div>
        
                    <div class="contents lg:hidden">
                    {#if !inputActive}    
                        <Heading tag="h3" class="w-fit text-xl sm:text-2xl font-semibold dark:text-white">
                            Activity
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

                <div class="hidden md:grid grid-cols-[4fr_1fr] font-bold text-base 
                    border-b border-gray-200 dark:border-gray-700 my-1 mx-3 w-full"
                >
                    <div class="grid grid-cols-[1fr_3fr] text-left">
                        <p>Date</p>
                        
                        <div class="grid grid-cols-1 lg:grid-cols-2">
                            <p>Description</p>
                            <p class="hidden lg:block">Notes</p>
                        </div>
                    </div>
                    
                    <p class="text-right">Balance</p>
                </div>

                <ul class="font-semibold divide-y divide-gray-200 dark:divide-gray-700">
                {#each filter_logs(userLogs.filter(v => v.uId===id), value) as elm}
                {@const {id, date, desc, type, notes, old, total} = elm}

                    <li class={twMerge(`px-3 py-1 w-full h-fit`, 
                        (in_state==="undo") && 'hover:bg-gray-200 dark:hover:bg-gray-700')}
                    >
                        <button class={twMerge(`w-full h-fit grid grid-cols-[4fr_1fr] items-center 
                            cursor-default`, (in_state==="undo") && "hover:cursor-pointer")}
                            on:click={() => (in_state==="undo") && undo_log(id)}
                        >
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
                        </button>
                    </li>
                {/each}
                </ul>

            {#await logPromise}
                <div class="w-full pt-6 flex flex-row justify-center">
                    <Spinner size={12} />
                </div>
            {/await}
            </div>
        </div>
    {/if}
    </Card>


    {#if in_state==="create" && !activeUser}
    <Modal open size="xs" classBody="space-y-0" 
        on:close={() => in_state==='create' && (in_state=null)}
    >
        <div class="flex flex-col w-full gap-y-6">
            <h3 class="text-2xl font-semibold text-gray-900 dark:text-white">
                Create A New User
            </h3>

            <div class="flex flex-row gap-4 w-full">
                <FloatingLabelInput classDiv="w-1/2" classInput="font-semibold"id="user_fname">
                    First Name
                </FloatingLabelInput>
                <FloatingLabelInput classDiv="w-1/2" classInput="font-semibold"id="user_lname">
                    Last Name
                </FloatingLabelInput>
            </div>
            
            <FloatingLabelInput classInput="font-semibold" value="default.pass" id="user_passwd">
                Password
            </FloatingLabelInput>

            <div class="flex flex-row items-center font-semibold gap-1">
                Team:

                <button class="w-fit h-fit p-1 flex flex-row underline-offset-[6px]
                    hover:text-primary-600 dark:hover:text-primary-500 hover:underline"
                >
                    {selectedTeam?.name ?? '(none)'}
                    <AngleRightOutline size="lg" />
                </button>

                <Dropdown placement="right-start" 
                    class="py-0" classFooter="py-0"
                >
                {#each teams.filter(v => v.cId===$activeClass) as team}
                    <DropdownItem on:click={() => selectedTeam=team}>
                        {team.name}
                    </DropdownItem>
                {/each}
                    <DropdownItem slot="footer" class="text-center"
                        on:click={() => selectedTeam=null}
                    >
                        (none)
                    </DropdownItem>
                </Dropdown>
            </div>

            <div class="w-full flex flex-row justify-center">
                <Button color="primary" class="w-1/2 font-semibold text-md"
                    on:click={() => create_new_user()}
                >
                    Create
                </Button>
            </div>
        </div>
    </Modal>
    {/if}
</div>