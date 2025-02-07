<script>
    import { page } from "$app/stores";
    
    import { twMerge } from "tailwind-merge";
    import { writable } from "svelte/store";
    import { setContext, onMount } from "svelte";
    
    import { refetch_server, update_server_data } from '$lib/common/cmd';
    import { session_logout, date_desc_from_hour } from "$lib/common/utils";
    
    import { ChartPieOutline, RectangleListSolid, StoreOutline } from 'flowbite-svelte-icons';
    import { BottomNav, BottomNavItem, Navbar, NavBrand, DarkMode, Spinner } from 'flowbite-svelte';


    import Store from '$lib/user/Store.svelte';
    import Activity from '$lib/user/Activity.svelte';
    import Dashboard from '$lib/user/Dashboard.svelte';

//>===========================================================================================<//

    const activeClassMobile = "text-primary-600 dark:text-primary-500 bg-gray-50 dark:bg-gray-800 border-none";
    const activeClassDesktop = 'underline underline-offset-4 text-primary-600 dark:text-primary-500';

    const navIconClass = "w-7 h-7 mb-1 text-gray-500 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-500";
    const navIconActiveClass = 'text-primary-600 dark:text-primary-500';

    const posts = [
        { name: 'Dashboard', elm: Dashboard, icon: ChartPieOutline    }, 
        { name: 'Activity',  elm: Activity,  icon: RectangleListSolid },
        { name: 'Store',     elm: Store,     icon: StoreOutline,      }, 
    ];

//>==========================================================================<//
    
    let activeIdx = 0;
    let activeTab = posts[0].name;

    
    const spinner = writable(false);
    const serverData = writable({});

    setContext('spinner', spinner);
    setContext("serverData", serverData); 


    update_server_data($page.data.initData, serverData);
    $: firstname = $serverData.user[0].name.split(' ')[0];

//>=================================================================================<//  
    
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

        document.title = `Ecoin - ${activeTab}`;
        refetch_server('class-user-teams-prices-logs-leadWealth-leadEarned-activeBids-placedBids', '/user', serverData);
    }   

    // Control + Arrow key detection
    onMount(() => document.onkeydown = (ev) => 
    {
        function move(dir)
        {
            ev.preventDefault();
            swap_tabs((activeIdx + dir + posts.length) % posts.length);
        }
        
        if(ev.defaultPrevented || !ev.ctrlKey) return;

        if(ev.key === 'ArrowLeft') move(-1);
        if(ev.key === 'ArrowRight') move(1);
    });

//>============================================================================================<//

</script>


<svelte:head>
    <title>Ecoin - {posts[0].name}</title>
</svelte:head>

<div class="fixed top-0 left-0 w-full h-full max-sm:h-[calc(100vh-4rem)] flex flex-col">
    <header class="relative w-full h-fit bg-white dark:bg-gray-800 border-gray-400 dark:border-gray-600">

        <Navbar fluid={true} class="text-black dark:text-white border-b px-4 sm:px-6" color="default">
            <NavBrand class="divide-gray-200 dark:divide-gray-700 divide-x cursor-default">
                <button on:click|preventDefault={() => document.querySelector('main')?.scroll({top:0, behavior:'smooth'})}
                    class="self-center whitespace-nowrap text-xl font-semibold sm:text-2xl pr-3">ECoin Bank </button>

                <h3 class="text-md font-semibold leading-none text-gray-800 dark:text-gray-200 sm:text-lg pl-3 pt-1 hidden sm:block">
                    {`Good ${date_desc_from_hour()}, ${firstname}`}
                </h3>
            </NavBrand>
    
            <div class="ms-auto flex items-center divide-x h-fit text-gray-500 dark:text-gray-400 divide-gray-200 dark:divide-gray-700">
                <DarkMode btnClass="pr-3"/>
                <button on:click={v => session_logout('/user')} 
                    class="font-medium pl-3 hover:text-primary-600 dark:hover:text-primary-500">Sign Out</button>
            </div>
        </Navbar>

        <div class="hidden md:contents">
            <div class="flex justify-start px-3 py-2 border-b divide-x text-medium font-medium 
                border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 divide-gray-200 dark:divide-gray-700"
            >
                {#each posts as { name } (name)}
                    <button class={twMerge('hover:text-primary-600 dark:hover:text-primary-500 px-3', (name===activeTab) && activeClassDesktop)}
                        on:click={() => swap_tabs(name)}>{name}</button>
                {/each}
            </div>
        </div>
    </header>

    <main class="relative w-full h-full overflow-y-scroll bg-gray-100 dark:bg-gray-900 py-6 px-4 sm:px-6">
        {#each posts as { name, elm } (name)}
            <div class={(name===activeTab) ? 'contents' : 'hidden'}>
                <svelte:component this={elm}></svelte:component>
            </div>
        {/each}
    </main>
</div>

<BottomNav classOuter="md:hidden" classInner={`grid-cols-${posts.length} w-full max-w-[100vw]`} activeUrl={activeTab}>
    {#each posts as { name, icon } (name)}
        <BottomNavItem btnName={name} on:click={() => swap_tabs(name)}
            btnClass={(name===activeTab) && activeClassMobile} spanClass={(name===activeTab) && activeClassMobile}
        >
            <svelte:component this={icon} class={twMerge(navIconClass, (name===activeTab) && navIconActiveClass)} />
        </BottomNavItem>
    {/each}
</BottomNav>

{#if $spinner}
<div class="fixed top-0 left-0 w-screen h-screen z-50 bg-black/20">
    <div class="flex items-center justify-center w-full h-full">
        <Spinner size={12} />
    </div>
</div>
{/if}