import { get } from "svelte/store";
import { errorPopup } from "./utils";

/** 
 * @param {string} target 
 * @param {import("svelte/store").Writable<any>} serverData
 */
export function gen_get_args(target, serverData)
{
    const sData = get(serverData);
    const targets = target.split('-');

    return Object.fromEntries(
        targets.map(v => [v, { 
            ids: sData[v]?.map(v => v.id ?? 0) ?? [],
            time: sData[v]?.reduce((p,c) => Math.max(p,c.updated ?? 0), 0) ?? 0 
        }])
    );
}

/**
 * @param {any} json
 * @param {import("svelte/store").Writable<any>} serverData
 */
export function update_server_data(json, serverData)
{
    serverData.update(data => 
    { 
        for(const table in json)
        {
            let old = data[table];
            const sElm = json[table];

            // TODO: clean this
            old = old?.filter(v => !v.id || (
                !sElm.old.some(w => w === v.id) && 
                !sElm.data.some(w => w.id === v.id)
            )) ?? [];

            data[table] = old.concat(sElm.data).sort((a,b) => a.id - b.id);
        }

        // data['prices'] may contain an unparsed JSON string
        for (const v of (data['prices'] ?? [])) {
            if(typeof v.cost === 'string') v.cost = JSON.parse(v.cost);
        }
        
        return data;
    });
}

/** 
 * @param {string} target 
 * @param {string} folder
 * @param {import("svelte/store").Writable<any>} serverData
 * @param {(...data: any[]) => void} [onFail=console.error] 
 */
export async function refetch_server(target, folder, serverData, onFail = console.error)
{
    const args = gen_get_args(target, serverData);
    
    const res = await fetch(`${folder}/api/get`, { body: JSON.stringify(args), method: 'POST' });
    if(!res.ok) return onFail && onFail(await res.json());
    
    update_server_data(await res.json(), serverData);
}


//>========================================================================================================<//

export const initString = 'classes-users-teams-prices-placedBids-activeBids-purchases';

/**
 * @param {string} table 
 * @param {number[]} ids 
 * @param {Record<string, any>} p
 * @param {import("svelte/store").Writable<boolean>|null} spinner 
 * @param {import("svelte/store").Writable<Record<string, any>>} data
*/
export async function send_set_generic(table, ids, p, spinner, data)
{
    const body = { table, ids, p };

    spinner?.set(true);
    const res = await fetch('/admin/api/set', { body: JSON.stringify(body), method: 'POST' });

    spinner?.set(false);
    if(!res.ok) return errorPopup.set(`Error: ${(await res.json()).message}`);

    await refetch_server(initString, '/admin', data);
}


/**
 * @param {string} table 
 * @param {Record<string, any>[]} p
 * @param {import("svelte/store").Writable<boolean>|null} spinner 
 * @param {import("svelte/store").Writable<Record<string, any>>} data
*/
export async function send_add_generic(table, p, spinner, data)
{
    const body = { table, p };

    spinner?.set(true);
    const res = await fetch('/admin/api/add', { body: JSON.stringify(body), method: 'POST' });

    spinner?.set(false);
    if(!res.ok) { errorPopup.set(`Error: ${(await res.json()).message}`); return false; }

    await refetch_server(initString, '/admin', data);
}


/**
 * @param {string} tables
 * @param {number[][]} ids 
 * @param {import("svelte/store").Writable<boolean>|null} spinner 
 * @param {import("svelte/store").Writable<Record<string, any>>} data
*/
export async function send_del_generic(tables, ids, spinner, data)
{
    const sTbl = tables.split('-');
    const body = sTbl.reduce((p,v,i) => { p[v] = ids[i]; return p; }, {});

    spinner?.set(true);
    const res = await fetch('/admin/api/del', { body: JSON.stringify(body), method: 'POST' });

    spinner?.set(false);
    if(!res.ok) return errorPopup.set(`Error: ${(await res.json()).message}`);

    await refetch_server(initString, '/admin', data);
}