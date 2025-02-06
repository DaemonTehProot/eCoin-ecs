"use strict";

import * as SQlite from 'better-sqlite3';

import { create_password } from './auth';
import { log_error, log_status } from "$lib/server/utils";

import { readFileSync, writeFileSync, renameSync } from "node:fs";


/** @type {import("better-sqlite3").Database} */
export var db;

/** @type {Record<string, import("better-sqlite3").Statement<unknown[], any>>} }*/
export const querys = {};

let dbIsSaving = false;
let dbIsSaveQueued = false;


export function db_init()
{
    /** @param {string} loc */ // Shitty ass solution that for some reason works
    function _mount_db_with_loc(loc) { db = new SQlite.default(readFileSync(loc)); }; 
    
    log_status('Mounting Database')

    try { 
        _mount_db_with_loc('data/db.sqlite'); 
    } catch {
        
        let i = 0;
        log_status('WARN - Initial db file missing/corrupted, falling back');

        for(; i < 3; i++) {
            try { _mount_db_with_loc(`data/backup/db${i}.sqlite`); break; }
            catch { log_status(`WARN - backup ${i} missing/corrupted, retry`); }
        }

        if(i == 3) throw Error('Cannot mount database, aborting');
    }

    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA journal_mode = WAL');
}


export function sql_file_init()
{
    log_status('Running init files');

    // NOTE: All statements at the end of either file must not end with ';;' 
    // Use no delimiter

    const iLines = readFileSync('data/sql/init.sql', 'utf-8').split(';;');
    const qLines = readFileSync('data/sql/querys.sql', 'utf-8').split(';;');

    for(const line of iLines) { db.exec(line); }
    for(const line of qLines) { const [name,cmd] = line.trimStart().split(':'); querys[name] = db.prepare(cmd); }

    Object.freeze(querys);
}


// TODO: Make database backup code
export function save_database()
{
    if(dbIsSaving) { dbIsSaveQueued = true; }
    else {
        dbIsSaving = true;
    
        setTimeout(() => {
    
            dbIsSaving = false;
            log_status('Saving Database...');
    
            writeFileSync('data/db.sqlite.tmp', db.serialize());
            renameSync('data/db.sqlite.tmp', 'data/db.sqlite');
            
            if(dbIsSaveQueued) {
                dbIsSaveQueued = false;
                save_database(); // run this again to ensure disk flush
            }
        }, 60000);
    }
}
