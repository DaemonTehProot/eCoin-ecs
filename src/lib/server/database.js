"use strict";

import { env } from '$env/dynamic/private';
import { log_status } from "$lib/server/utils";
import { create_password } from '$lib/server/auth';

import cLines from '$lib/server/sql/create';
import qLines from '$lib/server/sql/querys';

export const querys = {};


export async function db_init()
{
    log_status('Setting Up Database');
    await env['eCoin_DB']?.exec('PRAGMA foreign_keys = ON');

    /** @type {string[]} */
    const tables = (await env['eCoin_DB']?.prepare("SELECT name FROM sqlite_master WHERE type='table'").raw()).flat();

    if(tables.length == 0) {
        log_status('Creating Database Structure');

        for(const line of cLines.split(';;')) 
        { 
            const cmd = line.trim(); 
            if(cmd.length) await env['eCoin_DB']?.exec(cmd); 
        }

        await save_database([
            env['eCoin_DB']?.prepare('INSERT INTO admin(passwd) VALUES(?)').bind(create_password('eCoin-Dev'))
        ]);
    }
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
