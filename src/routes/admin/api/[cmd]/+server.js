"use strict";

import { env } from '$env/dynamic/private';

import { error } from '@sveltejs/kit';
import { querys, save_database } from '$lib/server/database';

import { verify_array_type, verify_object_types, rightFit, async_filter } from '$lib/server/utils';
import { validate_token, auth_generic_request, session_logout, create_password } from '$lib/server/auth';


/**
 * @param {{pass: string, passNew?: string}} args
 * @param {import('@sveltejs/kit').Cookies} cookies
*/
async function auth_admin_request({pass, passNew}, cookies)
{
    if(!pass || !pass.length) error(422, 'Missing/Malformed value: args.pass');

    const creds = await querys.getAdminCreds.first();    
    if(!creds) error(500, "No admin list found");

    const sessionId = cookies.get('sessionId');
    return auth_generic_request(pass, passNew, creds.passwd, 'activeAdmins', '/admin', null, sessionId);
}


/**
 * @param {Record<string, {time: number, ids: number[]}>} args
*/
async function admin_command_get(args)
{
    const data = {}, trans = [];
    const entry = Object.entries(args);

    for(const [table, {time}] of entry)
    {
        if(typeof time != 'number') error(422, `Missing/Invalid value "args[${table}].time"`);

        switch(table) {    
        case 'teams':  trans.push(querys.getTeamMulti.bind(time)); break;
        case 'prices': trans.push(querys.getPriceMulti.bind(time)); break;

        case 'users':   trans.push(querys.getUserMulti.bind(time)); break;
        case 'classes': trans.push(querys.getClassMulti.bind(time)); break;

        case 'activeBids': trans.push(querys.getActiveBidsMulti.bind(time)); break;
        case 'placedBids': trans.push(querys.getPlacedBidsMulti.bind(time)); break;

        case 'logs':      trans.push(querys.getLogsMulti.bind(time)); break;
        case 'purchases': trans.push(querys.getPurchasesMulti.bind(time)); break;

        default: error(422, `Unknown table "${table}"`);
        }
    }

    const res = (await save_database(trans)).map(v => v.results);
    
    let i = 0;
    for(const [table, {ids}] of entry) 
    {
        verify_array_type(ids, 'number', `args[${table}].ids`);
        const cur = (await env['eCoin_DB']?.prepare(`SELECT id FROM ${table}`).raw()).flat();
    
        data[table] = { old: ids.filter(v => !cur.includes(v)), data: res[i++] };
    }

    return Response.json(data);
}

//>=========================================================================<//

const requiredAddParams = Object.freeze({
    users: { cId: 'number', tId: 'number.null', name: 'string', pass: 'string' },
    classes: { name: 'string', mp: 'number' },

    teams: { cId: 'number', name: 'string' },
    prices: { cId: 'number', type: 'string', desc: 'string' },

    activeBids: { cId: 'number', amount: 'number', desc: 'string' },
});

const validDeleteTables = Object.freeze([
    'classes', 'users', 'teams', 'prices', 
    'purchases', 'placedBids', 'activeBids',
]);

const validSetParams = Object.freeze({
    users: { name: 'string', tId: 'number.null', cId: 'number' },
    classes: { name: 'string', mp: 'number' },
    
    teams: { name: 'string' },
    prices: { type: 'string', desc: 'string', cost: 'string' },

    purchases: { cId: 'number' },
    activeBids: { desc: 'string', amount: 'number' }
});


/**
 * @param {{table: string, p: Record<string, any>[]}} args 
*/
function admin_command_add({table, p})
{  
    const trans = [];
    const updated = Date.now();

    if(!Array.isArray(p)) error(422, "Missing/Malformed value: args.p");
    if(!p.every(v => typeof(v) == 'object')) error(422, "Malformed value: args.p");

    switch(table)
    {
    case 'users': 
        p.forEach(p => {
            verify_object_types(p, requiredAddParams.users);
            trans.push(querys.addUser.bind(p.cId, p.tId, p.name, create_password(p.pass), updated)); 
        }); break;

    case 'classes': 
        p.forEach(p => {
            verify_object_types(p, requiredAddParams.classes);
            trans.push(querys.addClass.bind(p.mp, p.name, updated));
        }); break;

    case 'teams': 
        p.forEach(p => {
            verify_object_types(p, requiredAddParams.teams);
            trans.push(querys.addTeam.bind(p.cId, p.name, updated));
        }); break;

    case 'prices': 
        p.forEach(p => {
            verify_object_types(p, requiredAddParams.prices);
            verify_array_type(p.cost, 'number', 'args.p.cost');
            trans.push(querys.addPrice.bind(p.cId, p.type, p.desc, JSON.stringify(rightFit(p.cost, 8)), updated));
        }); break;

    case 'activeBids':
        p.forEach(p => {
            verify_object_types(p, requiredAddParams.activeBids);
            trans.push(querys.addActiveBid.bind(p.cId, p.amount, p.desc, '', updated));
        }); break;

    default: error(422, "Missing/Malformed value: args.table");
    }

    return save_database(trans).then(v => Response.json({}));
}

/**
 * @param {Record<string, number[]>} args
*/
function admin_command_del(args)
{    
    const trans = [];
    for(const [table, ids] of Object.entries(args))
    {
        if(!validDeleteTables.includes(table)) continue;
        verify_array_type(ids, 'number', `args.${table}`);

        trans.push(env['eCoin_DB']?.prepare(`DELETE FROM ${table} WHERE id IN (${ids})`));
    }

    return save_database(trans).then(v => Response.json({}));
}

/**
 * @param {{table: string, ids: number[], p: Record<string, any>}} args 
*/
function admin_command_set({table, ids, p}) 
{  
    const trans = [];
    const updated = Date.now();

    verify_array_type(ids, 'number', 'args.ids');

    if(table in validSetParams)
    {
        verify_object_types(p, validSetParams[table]);
        const argsStr = Object.keys(p).reduce((p,k) => p + `${k}=?,`, '');
        
        trans.push(
            env['eCoin_DB']?.prepare(
            `UPDATE ${table} SET ${argsStr} updated=${updated} WHERE id IN (${ids})`).bind(...Object.values(p))
        );
    }

    return save_database(trans).then(v => Response.json({}));
}

/**
 * @param {{id: number, pass: string}} args 
*/
function admin_command_passwd({id, pass})
{
    const updated = Date.now();

    if(typeof id !== 'number') error(422, "Missing/Malformed value: args.id");
    if(typeof pass !== 'string') error(422, "Missing/Malformed value: args.pass");

    const stmt = env['eCoin_DB']?.prepare(`UPDATE users SET passwd=?, updated=${updated} WHERE id=${id}`);
    return save_database([stmt.bind(create_password(pass))]).then(v => Response.json({}));
}

//<==================================================================================>//

/**
 * @param {{pId: number, quant: number, tax: number, notes?: string, ids: number[]}} args 
 */
async function admin_command_trans({pId, quant, tax, notes, ids})
{
    const now = Date.now();
    
    if(typeof pId !== 'number') error(422, "Missing/Malformed value args.pId");
    if(typeof tax !== 'number') error(422, "Missing/Malformed value args.tax");
    if(typeof quant !== 'number') error(422, "Missing/Malformed value args.quant");
    
    const trans = [];
    verify_array_type(ids, 'number', 'args.ids');
    
    const p = await querys.getPriceById.bind(pId).first();
    if(!p) error(422, "Invalid price identifier");


    for(const uId of ids)
    {
        const u = await querys.getUserById.bind(uId).first();
        if(!u) continue;

        let total = Math.trunc(quant * p.cost);
    
        if(p.type === 'Purchase') {
            if((total+u.balance) < 0) error(422, `Not enough eCoins on user ${u.name}`);

            trans.push(querys.userTransact.bind(total, now, uId));
            trans.push(querys.addPurchase.bind(uId, u.cId, p.desc, notes ?? '', quant, now));
        } else {
            if(p.type === 'Wage') total -= Math.trunc(total*tax);

            trans.push(querys.adminTransact.bind(total, total, now, uId));
            if(u.tId) trans.push(querys.teamTransact.bind(total, now, u.tId));
        }

        trans.push(querys.addLog.bind(uId, p.desc, p.type, notes ?? '', u.balance+total, total, now));
    }

    return save_database(trans).then(v => Response.json({}));
}

/**
 * @param {{ bId: number, max: number }} args
*/
async function admin_command_bid({bId, max})
{
    const now = Date.now();
    
    if(typeof bId !== 'number') error(422, "Missing/Malformed value: args.bId");
    if(typeof max !== 'number') error(422, "Missing/Malformed value: args.max");

    const bid = (await querys.getBidById.bind(bId).first());
    const placed = (await querys.getPlacedByBidId.bind(bId).run()).results;
    
    // unique: bids are arranged into groups based on uId, then filtered by amount starting from bid.amount 
    // usable: bids then removed based on if user has enough money, then the top ones are taken with at most max chosen

    const unique = Object.values(placed.reduce((p,c) => { if(c.amount >= (p[c.uId]?.amount ?? -bid.amount)) p[c.uId] = c; return p }, {}));
    
    const _fmap = await async_filter(unique, async v => v.amount <= await querys.getUserById.bind(v.uId).first('balance'));
    const usable = _fmap.sort((a,b) => b.amount - a.amount).splice(0, max);

    const trans = [];
    for(const {uId, amount} of usable)
    {
        const old = await querys.getUserById.bind(uId).first('balance');

        trans.push(querys.userTransact.bind(-amount, now, uId));
        trans.push(querys.addLog.bind(uId, bid.desc, 'Bid', bid.notes ?? '', old-amount, -amount, now));
    }

    trans.push(env['eCoin_DB']?.prepare(`DELETE FROM activeBids WHERE id=${bId}`)); 
    return save_database(trans).then(v => Response.json(usable));
}

/**
 * @param {{id: number}} args 
*/
async function admin_command_undo({id})
{
    const now = Date.now();
    let {uId, desc, total, type, notes} = await querys.getLogById.bind(id).first();

    total = -total;
    const u = await querys.getUserById.bind(uId).first();

    const trans = [];
    if(type !== 'Wage' && type !== 'Fine') 
    {
        trans.push(querys.userTransact.bind(total, now, uId));
    } else 
    {
        trans.push(querys.adminTransact.bind(total, total, now, uId));
        if(u.tId) trans.push(querys.teamTransact.bind(total, now, u.tId));
    }

    trans.push(querys.addLog.bind(uId, `Undo: "${desc}"`, 'Undo', notes, u.balance+total, total, now));
    return save_database(trans).then(v => Response.json({}));
}

//<===============================================================================>//

/** @type {import('./$types').RequestHandler} */
export async function POST({cookies, request, params})
{
    const args = await request.json();
    if(params.cmd === 'auth') return auth_admin_request(args, cookies);

    await validate_token(cookies, 'activeAdmins');

    switch(params.cmd)
    {
    case 'ping': return Response.json(Date.now());
        
    case 'get': return admin_command_get(args);
    case 'add': return admin_command_add(args);
    case 'del': return admin_command_del(args);
    case 'set': return admin_command_set(args);

    case 'bid': return admin_command_bid(args);
    case 'undo': return admin_command_undo(args);
    case 'trans': return admin_command_trans(args);
    case 'passwd': return admin_command_passwd(args);
    
    case 'logout': return session_logout(cookies, 'activeAdmins');
    }

    error(422, `Invalid command: ${params.cmd}`);
}