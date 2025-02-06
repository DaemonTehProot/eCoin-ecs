import { error } from "@sveltejs/kit";

export function load({ params })
{
    const s = +params.code;

    if(isNaN(s) || s < 400 || s > 599) 
        return error(500, 'Unknown Code');
    else 
        return error(s, 'Not Found');
}