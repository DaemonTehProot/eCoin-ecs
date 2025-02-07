<script>
    import { goto } from "$app/navigation";
    import { twMerge } from 'tailwind-merge';

    import { errorPopup } from "../utils";

    import { Navbar, NavBrand, DarkMode, Spinner } from 'flowbite-svelte';
    import { FloatingLabelInput, Checkbox, Button, Helper } from "flowbite-svelte";
    
    
    
    export let desc;
    export let messages;
    
    export let folder = '';
    export let spinner = false;
    export let showHidden = false;

    export let formClass = "grid gap-6 items-end w-1/3 min-w-[260px] h-fit grid-cols-1";
    export let checkboxClass = "mt-3 text-sm lg:text-base";

    /** @type {('base'|'green'|'red'|undefined)[]} */
    const colors = new Array(desc.length).fill('base');

    const classLabel = "text-sm lg:text-base bg-gray-100 dark:bg-gray-900";
    const classInput = "w-full lg:text-lg border-gray-400 dark:border-gray-700";

    function sendForm(ev)
    {
        let body = {};
        colors.fill('base')

        for(let idx = 0; idx < desc.length; idx++) 
        {
            const {hidden, name, json} = desc[idx];
            if(hidden && !showHidden) continue;

            /** @type {HTMLInputElement|null} */
            const val = document.getElementById(`Input-${name}`);

            if(!(val?.value.length)) { colors[idx] = 'red'; return false; }
            body[json] = val.value;
        }

        (async () => 
        {
            spinner = true;
            const res = await fetch(`${folder}/api/auth`, { body: JSON.stringify(body), method: 'POST' });

            if(res.ok) { await goto(folder) } 
            else { errorPopup.set(`Error: ${(await res.json()).message ?? '???'}`); }
            
            spinner = false;
        })();

        return false;
    }
</script>

<div class="fixed top-0 left-0 flex flex-col w-full h-full">
    <header class="relative w-full h-fit bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
        <Navbar fluid={true} color="default">
            <NavBrand>
                <span class="self-center whitespace-nowrap text-xl sm:text-2xl font-semibold text-black dark:text-white">
                    ECoin Login
                </span>
            </NavBrand>
    
            <div class="ms-auto flex items-center text-gray-500 dark:text-gray-400">
                <DarkMode />
            </div>
        </Navbar>
    </header>
    
    <main class="relative w-full h-full flex flex-row justify-center items-center bg-gray-100 dark:bg-gray-900">
        <form class={formClass} action="#"
        on:submit|capture|preventDefault={sendForm} 
        >
            {#each desc as {hidden, name, type, style}, idx}
                {#if !hidden || showHidden}
        
                <div>
                    <FloatingLabelInput id={`Input-${name}`} {classInput} {classLabel} color={colors[idx] ?? 'base'} class="w-full" {type} {style}>{name}</FloatingLabelInput>
                    {#if colors[idx]==='red'} <Helper color="red" for="name" class="mt-1 font-semibold">{messages[idx]}</Helper> {/if}
                </div>
                
                {/if}
            {/each}
            
            <Checkbox bind:checked={showHidden} class={twMerge(checkboxClass, $$props.classCheckbox)}>
                {$$props.boxMessage ?? 'Change Password' }
            </Checkbox>
            
            <Button outline={false} class="text-lg" type="submit">Lets go</Button>
        </form>
    </main>
</div>

{#if spinner}
<div class="fixed top-0 left-0 w-screen h-screen z-50 bg-black/20 pointer-events-none">
    <div class="flex items-center justify-center w-full h-full">
        <Spinner size={12} />
    </div>
</div>
{/if}