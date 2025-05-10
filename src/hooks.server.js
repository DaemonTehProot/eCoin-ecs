"use strict";

import { env } from "$env/dynamic/private";
import { building } from "$app/environment";
import { db_init, sql_file_init } from "$lib/server/database";


if(!Array.prototype.toReversed)
{
    Array.prototype.toReversed =
        function() { return this.slice().reverse() }
}

if(!Array.prototype.toSorted)
{
    Array.prototype.toSorted = 
        function(fn) { return this.slice().sort(fn) }
}


if(!building)
{
    await db_init();
    
const newLogs = 
`CREATE TABLE logsImpl(
    id integer NOT null PRIMARY KEY,
    uId integer NOT null REFERENCES users(id) ON DELETE CASCADE,

    desc text NOT null,
    type text NOT null,
    notes text NOT null,

    old integer NOT null,
    total integer NOT null,
 
    updated integer NOT null,
    date text NOT null DEFAULT (datetime('now', 'localtime'))
)`;

const getter = 'SELECT uId, desc, type, notes, old, total, updated, date FROM logs';
const setter = 'INSERT INTO logs_Impl(uId, desc, type, notes, old, total, updated, date) VALUES(?,?,?,?,?,?,?,?)';

        const db = env['eCoin_DB'];

        let words = newLogs.replace(/\n/g, " ");

        db.exec('DROP TABLE IF EXISTS logsImpl');
        await env['eCoin_DB']?.exec(words);

        const set = db?.prepare(setter);
        const get = (await db?.prepare(getter).run()).results;
       
        for(const e of get) {
            await set.bind(e.uId, e.desc, e.type, e.notes, e.old, e.total, e.updated, e.date).run();
        }
    
        await db.batch([
            db?.prepare('DROP TABLE logs'),
            db?.prepare('ALTER TABLE logsImpl RENAME TO logs'),
        ]);

    await sql_file_init();
}