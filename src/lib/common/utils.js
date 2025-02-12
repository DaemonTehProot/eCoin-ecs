import { writable } from "svelte/store";


/** @param {number} v */ export const int2cash = (v) => `${v<0 ? '-':''}$${Math.abs(v*.01).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
/** @param {number} v */ export const int2color = (v) => (v<0) ? 'text-red-500 dark:text-red-500' : (v>0) ? 'text-green-500 dark:text-green-500' : 'text-gray-500 dark:text-gray-400';


export function date_desc_from_hour()
{
    // Modulus 21 wraps [21, 23] to [0, 2]
    const hour = new Date().getHours() % 21;

    if(hour < 5)  return 'Night';
    if(hour < 12) return 'Morning';
    if(hour < 17) return 'Afternoon';
    if(hour < 21) return 'Evening';

    return '(BUG)';
}

/** @param {string} path */
export async function session_logout(path)
{
   // if(getContext('status') !== 'Loading')
    {
        document.cookie = `sessionId=;Max-Age=0;Path=${path};domain=${location.hostname}`;
        await fetch(`${path}/api/logout`, { body: "{}", method: 'POST' });

        location.href = `${path}/login`;
    }
}


/** @type {(arr: Record<string, any>[], elm: string, reverse: boolean) => any} */
export function sort_by_field(arr, elm, reverse=false)
{
    const fn = reverse ? 
        (a,b) => ((a > b) ? -1 : ((a < b) ? 1 : 0)):
        (a,b) => ((a < b) ? -1 : ((a > b) ? 1 : 0));

    return arr.toSorted((a, b) => fn(a[elm], b[elm]));
}

/** @type {<T>(obj: Record<string,T>, mapFn: (a:string, b:T) => any) => Record<string,any>} */
export function object_map(obj, mapFn)
{
    return Object.keys(obj).reduce((r, k) => { r[k] = mapFn(k, obj[k]); return r; }, {});
}


/** @type {(v: number, min: number, max: number) => number} */
export function clamp(v, min, max)
{
    return Math.min(Math.max(v, min), max);
}


/** @param {number} v */
export function add_suffix(v)
{
    let s;

    switch(v % 10)
    {
    case 1:  s='st'; break;
    case 2:  s='nd'; break;
    case 3:  s='rd'; break;
    default: s='th'; break;
    }

    return `${v}${s}`;
}

//<-------------------------------------------------------------->//

export const errorPopup = writable("");