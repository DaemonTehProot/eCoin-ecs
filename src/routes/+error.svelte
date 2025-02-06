<script>
    import "../app.css";
    import { page } from "$app/stores";    

    import NotFound from "$lib/common/errors/NotFound.svelte"; 
    import Maintenance from "$lib/common/errors/Maintenance.svelte";
    import ServerError from "$lib/common/errors/ServerError.svelte";


    const pages = {
        400: Maintenance,
        404: NotFound,
        500: ServerError
    };

    const status = +$page.status;
    const index = Object.keys(pages).map(x => +x).reduce((p,c) => (p < status ? c : p));
</script>

<svelte:component this={pages[index]}></svelte:component>