<script>
    import { page } from "$app/stores";
    
    import { twMerge } from 'tailwind-merge';
    import { writable, get } from "svelte/store";
    import { setContext, onMount } from "svelte";

    import { session_logout, date_desc_from_hour, clamp } from "$lib/common/utils";
    import { refetch_server, update_server_data, send_set_generic, send_add_generic, send_del_generic } from "$lib/common/cmd";

    import { Navbar, NavBrand, DarkMode, Spinner, Frame, Dropdown, DropdownItem, Radio, FloatingLabelInput, Modal, Button } from "flowbite-svelte";
    import { UserOutline, UsersGroupOutline, DollarOutline, CartOutline, CashOutline, ChevronRightOutline, TrashBinOutline, EditOutline, ExclamationCircleOutline, FileCopyAltOutline } from "flowbite-svelte-icons";
   
    import Users from "$lib/admin/Users.svelte";
    import Teams from "$lib/admin/Teams.svelte";
    import Prices from "$lib/admin/Prices.svelte";
    import Biddings from "$lib/admin/Biddings.svelte";
    import Requests from "$lib/admin/Requests.svelte";

//>====================================================================<//

    const posts = [
        { name: 'Users',    elm: Users,    ico: UserOutline       },
        { name: 'Teams',    elm: Teams,    ico: UsersGroupOutline },
        { name: 'Prices',   elm: Prices,   ico: DollarOutline     },
        { name: 'Biddings', elm: Biddings, ico: CashOutline       },
        { name: 'Requests', elm: Requests, ico: CartOutline       },
    ];

    const activeBtnStyle = 'bg-gray-100 dark:bg-gray-700';
    const activeTextStyle = 'text-primary-600 dark:text-primary-500';

//>=======================================================<//

    let activeIdx = 0;
    let activeTab = posts[0].name;

    const spinner = writable(false);
    const serverData = writable({});
    const activeClass = writable(1);

    setContext('spinner', spinner);
    setContext('serverData', serverData);
    setContext('confirmMsg', confirmMsg);
    setContext('activeClass', activeClass);

    update_server_data($page.data.initData, serverData);

//>===========================================================<//

    let confirmStr = null;
    let confirmResolve = null;

    async function confirmMsg(val)
    {
        const { promise, resolve } = Promise.withResolvers();

        confirmStr = val;
        confirmResolve = resolve;

        return promise;
    }

//>========================================================<//

    let classToCopy = 0;
    let classToRename = 0;

    let makingNewClass = false;

    $: activeClassObj = $serverData["classes"].find(v => v.id === $activeClass);

    let __selectClassImp__ = 1;
    $: { $activeClass = __selectClassImp__; }


    const rename_class = (name) => { send_set_generic('classes', [classToRename], {name}, spinner, serverData); classToRename=0;}
    

    async function add_class(name) 
    {
        makingNewClass=false; 
        await send_add_generic('classes', [{name, mp:0}], spinner, serverData);
        
        if(classToCopy) 
        {
            const cId = $serverData["classes"].at(-1).id;
            const vals = $serverData["prices"].filter(v => v.cId === classToCopy);

            await send_add_generic('prices', vals.map(v => { return {...v, cId}}), spinner, serverData);
        }

        classToCopy=0;
    }
    
    async function delete_class(name, id)
    {
        if(!await confirmMsg(`Delete class ${name}?`)) return;
        await send_del_generic('classes', [[id]], spinner, serverData);

        if($activeClass === id) __selectClassImp__ = $serverData["classes"][0]?.id ?? 1;
    }
    
    async function set_class_mp(mp) 
    {
        mp = clamp(+mp, 1, 8) - 1;

        if(await confirmMsg(`Set ${activeClassObj.name}'s MP to ${mp+1}?`))
            send_set_generic('classes', [get(activeClass)], {mp}, spinner, serverData);
    }

//>========================================================<//

    /** @param {string|number} tab */
    function swap_tabs(tab)
    {
        if(typeof tab == 'string') 
        {
            activeTab = tab;
            activeIdx = posts.findIndex(v => v.name===tab);
        } else 
        {
            activeIdx = tab;
            activeTab = posts[tab].name;
        }

        document.title = `Ecoin Admin - ${activeTab}`;
        refetch_server('classes-users-teams-prices-activeBids-placedBids-purchases', '/admin', serverData);
    }   

    // Control + Arrow key detection
    onMount(() => document.onkeydown = (ev) => 
    {
        if(ev.defaultPrevented || !ev.ctrlKey) return;

        function move(dir)
        {
            ev.preventDefault();
            swap_tabs((activeIdx + dir + posts.length) % posts.length);
        }

        if(ev.key === 'ArrowUp') move(-1);
        if(ev.key === 'ArrowDown') move(1);
    });
</script>


<svelte:head>
    <title>Ecoin Admin - {posts[0].name}</title>
</svelte:head>

<div class="fixed top-0 left-0 w-full h-full flex flex-col">
    <header class="w-full h-fit bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-600">
        <Navbar fluid={true} class="text-black dark:text-white border-b px-4 sm:px-6" color="default">
            <NavBrand class="divide-gray-200 dark:divide-gray-700 divide-x cursor-default">
                <button on:click|preventDefault={() => document.querySelector('main')?.scroll({top:0, behavior:'smooth'})}
                    class="self-center whitespace-nowrap text-xl font-semibold sm:text-2xl pr-3"> ECoin </button>

                <h3 class="text-md font-semibold leading-none text-gray-800 dark:text-gray-200 sm:text-lg px-3 pt-1 hidden md:block">
                    {`Good ${date_desc_from_hour()}, Admin`}
                </h3>
            </NavBrand>
    
            <div class="border-l border-gray-400 dark:border-gray-600 pl-6 flex flex-row">
                <button class="border-gray-400 dark:border-gray-600 border-b rounded pl-2">
                    <p class="flex font-lg font-semibold hover:text-primary-600 hover:dark:text-primary-500"> 
                        {activeClassObj?.name ?? '(No Classes)'}
                        <ChevronRightOutline size="lg"/>
                    </p>
                </button>
    
                <Dropdown class="w-fit p-3 text-md md:text-lg font-semibold" 
                    on:show={() => { classToRename=0; classToCopy=0; makingNewClass=false; }}
                >
                {#each $serverData['classes'] as { name, id }}
                    <div class="w-full h-fit flex flex-row items-center justify-between">
                    {#if classToRename !== id}
                        <Radio class="p-1 mr-2 flex items-center text-base" bind:group={__selectClassImp__} value={id}>
                            <p class={$activeClass===id ? 'text-primary-600 dark:text-primary-500' : ''}>
                                {name}
                            </p>
                        </Radio>
                    {:else}
                        <FloatingLabelInput autofocus value={name} 
                            inputClass="font-semibold" on:change={(e) => rename_class(e.target?.value) }/>
                    {/if}
                    
                        <div class="flex flex-row items-center">
                            <button class={twMerge(`w-fit h-fit p-1 hover:text-green-600 dark:hover:text-green-500
                                rounded-full outline-2`, (classToRename===id) && 'text-green-600 dark:text-green-500 outline')}
                                on:click={() => { classToCopy=0; classToRename = (classToRename===id) ? 0 : id; }}
                            >
                                <EditOutline size="md" />
                            </button>
                            
                            <button class="w-fit h-fit p-1 hover:text-red-700 dark:hover:text-red-600"
                                on:click={() => delete_class(name, id)}
                            >
                                <TrashBinOutline size="md" />
                            </button>

                            <button class={twMerge(`w-fit h-fit p-1 hover:text-green-600 dark:hover:text-green-500
                                rounded-full outline-2`, (classToCopy===id) && 'text-green-600 dark:text-green-500 outline')}
                                on:click={() => { classToRename=0; classToCopy = (classToCopy===id) ? 0 : id; }}
                            >
                                <FileCopyAltOutline size="md" />
                            </button>
                        </div>
                    </div>
                {/each}
                    <DropdownItem class="-my-1 w-full h-full" slot="footer">
                        <button class="w-full h-full text-base text-center"
                            on:click={() => { makingNewClass=true; }}
                        > 
                        {#if makingNewClass || classToCopy}
                            <FloatingLabelInput style="filled" autofocus
                                on:change={(e) => add_class(e.target?.value)}
                            >
                                New Class Name
                            </FloatingLabelInput>
                        {:else}
                            + Add Blank Class
                        {/if}
                        </button>
                    </DropdownItem>
                </Dropdown>
            
            {#if activeClassObj}
                <button class="border-gray-400 dark:border-gray-600 border-b rounded pl-2 ml-3">
                    <p class="flex font-lg font-semibold hover:text-primary-600 hover:dark:text-primary-500"> 
                        MP: {activeClassObj.mp + 1}
                        <ChevronRightOutline size="lg" />
                    </p>
                </button>

                <Dropdown class="w-fit flex -py-2 flex-col items-center text-md md:text-lg font-semibold">
                {#each [1,2,3,4,5,6,7,8] as mp}
                    <button class="hover:bg-gray-100 dark:hover:bg-gray-600 px-6 
                        w-full h-full hover:text-primary-600 dark:hover:text-primary-500"
                        on:click={() => set_class_mp(mp)}
                    >
                        {mp}
                    </button>
                {/each}
                </Dropdown>
            {/if}
            </div>

            <div class="ms-auto flex items-center divide-x h-fit text-gray-500 dark:text-gray-400 divide-gray-200 dark:divide-gray-700">
                <DarkMode btnClass="pr-3"/>
                <button on:click={v => session_logout('/admin')} 
                    class="font-medium pl-3 hover:text-primary-600 dark:hover:text-primary-500">Sign Out</button>
            </div>
        </Navbar>
    </header>

    <div class="w-full h-full bg-gray-100 dark:bg-gray-900 flex flex-row">
        <Frame tag="aside" class="border-r w-fit sm:w-58 h-full">
        {#each posts as { name, ico } (name)}
            <button on:click={() => swap_tabs(name)} 
                class={twMerge("w-full h-16 hover:bg-gray-100 dark:hover:bg-gray-700 flex flex-row items-center px-4", (name===activeTab) && activeBtnStyle)}
            >
                <svelte:component this={ico} size="xl" class={(name===activeTab) && activeTextStyle}></svelte:component>
                
                <div class={twMerge('px-3 text-lg font-semibold hidden sm:block', 
                    (name===activeTab) && activeTextStyle)}
                >
                    {name}
                </div>
            </button>
        {/each}
        </Frame>

        <main class="w-full h-full p-3 sm:px-4s overflow-y-auto">
            {#each posts as { name, elm } (name)}
                <div class={(name===activeTab) ? 'contents' : 'hidden'}>
                    <svelte:component this={elm}></svelte:component>
                </div>
            {/each}

            <!--Do Not Remove!--> <br/><br/>
        </main>
    </div>
</div>

{#if $spinner}
<div class="fixed top-0 left-0 w-screen h-screen z-50 bg-black/20">
    <div class="flex items-center justify-center w-full h-full">
        <Spinner size={12} />
    </div>
</div>
{/if}

{#if confirmStr}
    <Modal open size="xs" autoclose
        on:close={() => { confirmResolve && confirmResolve(false); confirmStr=confirmResolve=null; }}
    >
        <div class="text-center">
            <ExclamationCircleOutline class="mx-auto mb-4 text-gray-400 dark:text-gray-200 w-12 h-12"/>
            <h3 class="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">{confirmStr}</h3>
   
            <Button color="alternative">Cancel</Button>
            
            <Button color="primary" class="me-2" autofocus on:click={() => 
                { confirmResolve(true); confirmResolve=confirmStr=null; }}
            >Yes
            </Button>
        </div>
    </Modal>
{/if}