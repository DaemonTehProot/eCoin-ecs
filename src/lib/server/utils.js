"use strict";

import { error } from "@sveltejs/kit";
import { querys } from "./database";

/**
 * Write to stdout and FILE_STATUS
 * @param {string} status 
 */
export function log_status(status)
{
    const now = new Date().toISOString();
    const msg = `[${now}] - ${status}\n`;

    // appendFileSync(FILE_STATUS, msg);
    console.log(`\x1b[32m${msg}\x1b[0m`); // Green text
}



/** @param {number} v |*| @param {number} min |*| @param {number} max */
export function clamp(v, min, max) { return Math.max(Math.min(v, max), min) };

/** @param {number[]} a |*| @param {number} len */
export function rightFit(a, len) { return a.concat(new Array(len).fill(0)).slice(0, len); } 


/** @param {any} v */
export function s_typeof(v) { return (v===null) ? 'null' : typeof(v); }


/** @type {(a: {[s:string]: any}[], prop: string) => {[s:string]: any}[][]}  */
export const group_by_prop = (a, prop) =>
    Object.values(a.reduce((p,c) => { p[c[prop]] = [...p[c[prop]] || [], c]; return p; }, {}));


/**
 * Assert that "obj" contains all of the fields present in "types". 
 * Then checks that the types in "obj" match those found in "types"
 * 
 * @param {any} obj Object to be checked
 * @param {{[v: string]: string}} types Object to be verified against   
 */
export function verify_object_types(obj, types)
{
    for(const t in types) 
    {
        if(obj[t] === undefined) continue; 
        if(types[t].includes(s_typeof(obj[t]))) continue;

        error(400, `Missing/Malformed value "${t}"`);
    }
}


/**
 * Assert that "obj" is an array and that all elements 
 * of it have their typeof equal "t"
 * 
 * @param {any} obj  Object to be checked
 * @param {string} t    Type required by all elements of "obj"
 * @param {string} name Name that would be referenced should this function throw
 * 
 * @returns {obj is any[]}
 */
export function verify_array_type(obj, t, name)
{
    if(Array.isArray(obj) && obj.every(e => t.includes(s_typeof(e)))) return true;
    error(400, `Missing/Malformed array "${name}"`);
}


/**
 * @param {number} pId 
 * @param {number} cId 
 * @param {string[]} allowed 
 * @returns {any}
 */
export function validate_price(pId, cId, allowed)
{
    const p = querys.getPriceById.get(pId);
    if(!p) error(422, 'Invalid price identifier');

    if(p.cId !== cId) error(422, 'Mismatching class identifiers');
    if(!allowed.includes(p.type)) error(422, 'Transaction type not allowed');

    return p;
}


/**
 * @param {number} bId 
 * @param {number} cId 
 * @returns {any}
 */
export function validate_bid(bId, cId)
{
    const p = querys.getPriceByBidId.get(bId);
    if(!p) error(422, 'Invalid price identifier');

    if(p.cId !== cId) error(422, 'Mismatching class identifiers');
    if(p.type !== 'Bid') error(422, 'Transaction type not allowed');

    return p;
}