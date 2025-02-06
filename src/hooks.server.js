"use strict";

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
    await sql_file_init();
}