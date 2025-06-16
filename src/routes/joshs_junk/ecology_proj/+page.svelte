<script>
    import { twMerge } from 'tailwind-merge';

    import { Range, Label } from 'flowbite-svelte';
    import { PauseOutline, RefreshOutline } from 'flowbite-svelte-icons';

    
    let isPaused = true;

    let lightLevel = 0.5;
    let elapsedTime = 0.0;

    let algaePopulation = 1;
    let waterQuality = 'Good';
    let zooplanktonPopulation = 1;
    

    let simCallback = null;
    function togglePause() {
        if(isPaused) {
            simCallback = setInterval(simulation_loop, 10);
        }
        else {
            clearInterval(simCallback);
            simCallback = null;
        }

        isPaused = !isPaused
    }

    function toggleReset() {
        if(!isPaused) togglePause();
        
        lightLevel = 0.5;
        elapsedTime = 0.0;

        algaePopulation = 1;   
        waterQuality = 'Good';
        zooplanktonPopulation = 1;

        document.getElementById('city').style.backgroundImage = "url('/City.png')"; 
        document.getElementById('lake').style.backgroundImage = "url('/WaterPool.png')";
    }

    function simulation_loop() {
        elapsedTime += 0.01;

        let zooDelta = (1 - sech(0.5 * elapsedTime * (0.5 - lightLevel))) * Math.sign(0.5 - lightLevel);
        zooplanktonPopulation = Math.min(2 - lightLevel, Math.max(1 - lightLevel, zooDelta + 1));

        algaePopulation = Math.max(0.5, Math.min(2, 2 - zooplanktonPopulation));

        if(zooplanktonPopulation > 1.5) {
            waterQuality = 'Excellent';
        } else if(zooplanktonPopulation > 1.2) {
            waterQuality = 'Great';
        } else if(zooplanktonPopulation > 0.8) {
            waterQuality = 'Good';
        } else if(zooplanktonPopulation > 0.6) {
            waterQuality = 'Fair';
        } else if(zooplanktonPopulation > 0.3) {
            waterQuality = 'Poor';
        } else if(zooplanktonPopulation > 0.1){
            waterQuality = 'Very Poor';
        } else {
            waterQuality = 'Leathal';
        }


        const colorsLake = [
            [235, 32, 21, 235],
            [10, 185, 211, 0],
            [52, 145, 57, 235],
        ];

        const lake = document.getElementById('lake');
        const city = document.getElementById('city');

        if(lake) {
            let c = [0, 0, 0, 0];
            let d = Math.abs(1 - zooplanktonPopulation);

            let idx = (zooplanktonPopulation > 1.01) ? 2 : (zooplanktonPopulation < 0.99 ? 0 : 1);
            
            c[0] = colorsLake[idx][0] * d + colorsLake[1][0] * (1 - d);
            c[1] = colorsLake[idx][1] * d + colorsLake[1][1] * (1 - d);
            c[2] = colorsLake[idx][2] * d + colorsLake[1][2] * (1 - d);
            c[3] = colorsLake[idx][3] * d + colorsLake[1][3] * (1 - d);

            lake.style.backgroundImage = 
                `radial-gradient(circle at center, rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]}) 0%, rgba(10, 185, 211, 0) 65%),
                url('/WaterPool.png')`;
        }

        if(city) {
            let c = Math.round(lightLevel * 255);
            let d = Math.round(c / 2);

            city.style.backgroundImage = 
                `url('/City.png'),
                radial-gradient(ellipse at center, rgba(${d}, ${d}, ${d}, 0.5) 0%, rgba(${c}, ${c}, ${c}, 0.5) 100%)`;
        }
    }

    const sech = (x) => {
        return 2.0 / (Math.exp(x) + Math.exp(-x))
    }

</script>

<style>
.gradient-img {
    width: 50vmin;
    height: 50vmin;
    background-size: cover;
}
</style>

<svelte:head>
    <title>EcoSym - Light</title>
</svelte:head>

<div class="fixed w-full h-full top-0 left-0 bg-gray-700">
    <div class="fixed w-fit h-fit top-0 left-0 flex flex-col gap-4">
        <div class="w-fit h-fit flex flex-row">
            <button class="p-2 m-2 bg-gray-200 rounded hover:bg-gray-300"
                    on:click={() => togglePause()}>
                <PauseOutline class="w-6 h-6" />
            </button>
            <button class="p-2 m-2 bg-gray-200 rounded hover:bg-gray-300"
                    on:click={() => toggleReset()}>
                <RefreshOutline class="w-6 h-6" />
            </button>
    
            <div class="flex flex-col justify-center pl-4 text-lg font-bold">
                <Label for="light-range" class="mb-2 font-bold">
                    Light Pollution Level: {~~((lightLevel+.005)*100)}%
                </Label>
    
                <Range id="light-range" min="0" max="1" step=".01"
                       bind:value={lightLevel} disabled={!isPaused}
                       class={twMerge('w-64', isPaused ? 'cursor-pointer' : 'cursor-not-allowed')}>
                </Range>
            </div>
        </div>
        <div class="flex flex-col bg-gray-200 rounded p-2 m-2 w-fit font-medium">
            <div class="flex flex-row justify-between w-full gap-2">
                <p>Elapsed time:</p><p>{elapsedTime.toFixed(2)} weeks</p>
            </div>
            <div class="flex flex-row justify-between w-full gap-2">
                <p>Water Quality:</p><p>{waterQuality}</p>
            </div>
            <div class="flex flex-row justify-between w-full gap-2">
                <p>Algae Population:</p><p>{Math.round(algaePopulation*100)}%</p>
            </div>
            <div class="flex flex-row justify-between w-full gap-2">
                <p>Surface Zooplankton:</p><p>{Math.round(zooplanktonPopulation*100)}%</p>
            </div>
        </div>
    </div>

    <div class="fixed flex flex-row justify-center w-full h-fit bottom-16 gap-64">
        <div class="gradient-img" style="background-image:url('/WaterPool.png')"id="lake"></div>
        <div class="gradient-img" style="background-image:url('/City.png')" id="city"></div>
    </div>

</div>