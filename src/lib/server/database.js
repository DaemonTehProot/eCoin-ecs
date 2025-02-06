"use strict";

import { env } from '$env/dynamic/private';
import { log_status } from "$lib/server/utils";

import cLines from '$lib/server/sql/create';
import qLines from '$lib/server/sql/querys';

export const querys = {};


export async function db_init()
{
    log_status('Setting Up Database');
    await env['eCoin_DB']?.exec('PRAGMA foreign_keys = ON');
}


export async function sql_file_init()
{
    log_status('Running init files');

    for(const line of qLines.split('\n')) 
    { 
        const [name, cmd] = line.trim().split(':'); 
        if(name.length) querys[name] = env['eCoin_DB']?.prepare(cmd.split(';')[0]);
    }

    Object.freeze(querys);
}



/** @type {(v: any[]) => Promise<{meta: any, results: any}[]>} */
export const save_database = (trans) => env['eCoin_DB']?.batch(trans);
