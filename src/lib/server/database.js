"use strict";

import { env } from '$env/dynamic/private';
import { log_status } from "$lib/server/utils";

import cLines from '$lib/server/sql/create';
import qLines from '$lib/server/sql/querys';


export const trans = []; 
export const querys = {};


export function db_init()
{
    log_status('Setting Up Database');

    env['eCoin_DB']?.exec('PRAGMA foreign_keys = ON');
    env['eCoin_DB']?.exec('PRAGMA journal_mode = WAL');
}


export function sql_file_init()
{
    log_status('Running init files');

    for(const line of qLines.split('\n')) 
    { 
        const [name, cmd] = line.trim().split(':'); 
        querys[name] = env['eCoin_DB']?.prepare(cmd); 
    }

    Object.freeze(querys);
}



/** @returns {Promise<any>} */
export function save_database()
{
    return env['eCoin_DB']?.batch(trans)?.then(() => trans.length=0);
}
