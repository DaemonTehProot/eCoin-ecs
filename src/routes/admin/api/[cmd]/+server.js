"use strict";

import { env } from '$env/dynamic/private';

import { error } from '@sveltejs/kit';
import { querys, save_database } from '$lib/server/database';

import { verify_array_type, verify_object_types, rightFit } from '$lib/server/utils';
import { validate_token, auth_generic_request, activeAdmins, create_password } from '$lib/server/auth';


/**
 * @param {{pass: string, passNew?: string}} args
*/
async function auth_admin_request({pass, passNew})
{
    if(!pass || !pass.length) error(422, 'Missing/Malformed value: args.pass');

    const creds = await querys.getAdminCreds.first();    
    if(!creds) error(500, "No admin list found");

    return auth_generic_request(pass, passNew, creds.passwd, activeAdmins, '/admin', null);
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

/*const requiredAddParams = Object.freeze({
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
});*/


/**
 * @param {{table: string, p: Record<string, any>[]}} args 
*/
/*function admin_command_add({table, p})
{  
    const updated = Date.now();

    if(!Array.isArray(p)) error(422, "Missing/Malformed value: args.p");
    if(!p.every(v => typeof(v) == 'object')) error(422, "Malformed value: args.p");

    switch(table)
    {
    case 'users': 
        p.forEach(p => {
            verify_object_types(p, requiredAddParams.users);
            querys.addUser.run(p.cId, p.tId, p.name, create_password(p.pass), updated); 
        }); break;

    case 'classes': 
        p.forEach(p => {
            verify_object_types(p, requiredAddParams.classes);
            querys.addClass.run(p.mp, p.name, updated);
        }); break;

    case 'teams': 
        p.forEach(p => {
            verify_object_types(p, requiredAddParams.teams);
            querys.addTeam.run(p.cId, p.name, updated);
        }); break;

    case 'prices': 
        p.forEach(p => {
            verify_object_types(p, requiredAddParams.prices);
            verify_array_type(p.cost, 'number', 'args.p.cost');
            querys.addPrice.run(p.cId, p.type, p.desc, JSON.stringify(rightFit(p.cost, 8)), updated);
        }); break;

    case 'activeBids':
        p.forEach(p => {
            verify_object_types(p, requiredAddParams.activeBids);
            querys.addActiveBid.run(p.cId, p.amount, p.desc, '', updated);
        }); break;

    default: error(422, "Missing/Malformed value: args.table");
    }

    save_database();
    return Response.json({});
}*/

/**
 * @param {Record<string, number[]>} args
*/
/*function admin_command_del(args)
{    
    for(const [table, ids] of Object.entries(args))
    {
        if(!validDeleteTables.includes(table)) continue;
        verify_array_type(ids, 'number', `args.${table}`);

        db.exec(`DELETE FROM ${table} WHERE id IN (${ids})`);
    }

    save_database();
    return Response.json({});
}

/**
 * @param {{table: string, ids: number[], p: Record<string, any>}} args 
*/
/*function admin_command_set({table, ids, p}) 
{  
    const updated = Date.now();

    verify_array_type(ids, 'number', 'args.ids');

    if(table in validSetParams)
    {
        verify_object_types(p, validSetParams[table]);
        const argsStr = Object.keys(p).reduce((p,k) => p + `${k}=?,`, '');
        
        db.prepare(`UPDATE ${table} SET ${argsStr} updated=${updated} WHERE id IN (${ids})`).run(...Object.values(p));
    }

    save_database();
    return Response.json({});
}

/**
 * @param {{id: number, pass: string}} args 
*/
/*function admin_command_passwd({id, pass})
{
    const updated = Date.now();

    if(typeof id !== 'number') error(422, "Missing/Malformed value: args.id");
    if(typeof pass !== 'string') error(422, "Missing/Malformed value: args.pass");

    db.prepare(`UPDATE users SET passwd=?, updated=${updated} WHERE id=${id}`).run(create_password(pass));

    save_database();
    return Response.json({});
}

//<==================================================================================>//

/**
 * @param {{pId: number, quant: number, tax: number, notes?: string, ids: number[]}} args 
 */
/*function admin_command_trans({pId, quant, tax, notes, ids})
{
    const now = Date.now();

    if(typeof pId !== 'number') error(422, "Missing/Malformed value args.pId");
    if(typeof tax !== 'number') error(422, "Missing/Malformed value args.tax");
    if(typeof quant !== 'number') error(422, "Missing/Malformed value args.quant");

    verify_array_type(ids, 'number', 'args.ids');
    
    const p = querys.getPriceById.get(pId);
    if(!p) error(422, "Invalid price identifier");


    for(const uId of ids)
    {
        const u = querys.getUserById.get(uId);
        if(!u) continue;

        let total = quant*p.cost;
    
        if(p.type === 'Purchase') {
            if((total+u.balance) < 0) error(422, `Not enough eCoins on user ${u.name}`);

            querys.userTransact.run(total, now, uId);
            querys.addPurchase.run(uId, u.cId, p.desc, notes ?? '', quant, now);
        } else {
            if(p.type === 'Wage') total -= total*tax;

            querys.adminTransact.run(total, total, now, uId);
            if(u.tId) querys.teamTransact.run(total, now, u.tId);
        }

        querys.addLog.run(uId, p.desc, p.type, notes ?? '', u.balance+total, total, now);
    }

    save_database();
    return Response.json({});
}

/**
 * @param {{ bId: number, max: number }} args
*/
/*function admin_command_bid({bId, max})
{
    const now = Date.now();
    
    if(typeof bId !== 'number') error(422, "Missing/Malformed value: args.bId");
    if(typeof max !== 'number') error(422, "Missing/Malformed value: args.max");

    const bid = querys.getBidById.get(bId);
    const placed = querys.getPlacedByBidId.all(bId);
    
    // unique: bids are arranged into groups based on uId, then filtered by amount starting from bid.amount 
    // usable: bids then removed based on if user has enough money, then the top ones are taken with at most max chosen

    const unique = Object.values(placed.reduce((p,c) => { if(c.amount >= (p[c.uId]?.amount ?? -bid.amount)) p[c.uId] = c; return p }, {}));
    const usable = unique.filter(v => v.amount <= querys.getUserById.get(v.uId).balance).sort((a,b) => b.amount - a.amount).splice(0, max);

    for(const {uId, amount} of usable)
    {
        const old = querys.getUserById.get(uId).balance;

        querys.userTransact.run(-amount, now, uId);
        querys.addLog.run(uId, bid.desc, 'Bid', bid.notes ?? '', old-amount, -amount, now);
    }

    db.exec(`DELETE FROM activeBids WHERE id=${bId}`); 

    save_database();
    return Response.json(usable);
}

/**
 * @param {{uId: number, desc: string, 
 *          notes: string, total: number, type: string}} args 
*/
/*function admin_command_undo({uId, desc, total, type})
{
    const now = Date.now();
    
    if(typeof uId   !== 'number') error(422, "Missing/Malformed value: args.uId");
    if(typeof type  !== 'string') error(422, "Missing/Malformed value: args.type");
    if(typeof desc  !== 'string') error(422, "Missing/Malformed value: args.desc");
    if(typeof total !== 'number') error(422, "Missing/Malformed value: args.total");

    total = -total;
    const u = querys.getUserById.get(uId);

    if(type !== 'Wage' && type !== 'Fine') 
    {
        querys.userTransact.run(total, now, uId);
    } else 
    {
        querys.adminTransact.run(total, total, now, uId);
        if(u.tId) querys.teamTransact.run(total, now, u.tId);
    }

    querys.addLog.run(uId, `Undo: "${desc}"`, 'Undo', '', u.balance+total, total, now);

    save_database();
    return Response.json({});
}

//<===============================================================================>//

/** @type {import('./$types').RequestHandler} */
export async function POST({cookies, request, params})
{
    const args = await request.json();
    if(params.cmd === 'auth') return auth_admin_request(args);

    validate_token(cookies, activeAdmins);

    switch(params.cmd)
    {
    case 'ping': return Response.json(Date.now());
        
    case 'get': return admin_command_get(args);
    /*case 'add': return admin_command_add(args);
    case 'del': return admin_command_del(args);
    case 'set': return admin_command_set(args);

    case 'bid': return admin_command_bid(args);
    case 'undo': return admin_command_undo(args);
    case 'trans': return admin_command_trans(args);
    case 'passwd': return admin_command_passwd(args);*/d
    }

    error(422, `Invalid command: ${params.cmd}`);
}