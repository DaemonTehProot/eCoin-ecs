"use strict";

import { env } from '$env/dynamic/private';

import { error } from '@sveltejs/kit';
import { querys, save_database } from '$lib/server/database';

import { verify_array_type, validate_price } from '$lib/server/utils';
import { validate_token, auth_generic_request, activeUsers } from '$lib/server/auth';


/**
 * @param {{name: string, pass: string, passNew?: string}} args 
 */
async function auth_user_request({name, pass, passNew})
{
    if(!name || !name.length) error(422, "Missing/Malformed value: args.name");
    if(!pass || !pass.length) error(422, "Missing/Malformed value: args.pass");

    const creds = await querys.getUserCredsByName.bind(name).first();
    if(!creds) error(422, "Invalid Username/Password");

    return auth_generic_request(pass, passNew, creds.passwd, activeUsers, '/user', creds.id);
}


/**
 * Man fuck this shit, why does it 
 * got to be so god damn compilcated???
 * 
 * @param {{id: number, cId: number}} user
 * @param {{[k:string]: {time: number, ids: number[]}}} args 
 */
async function user_command_get({id, cId}, args)
{
    const data = {}, trans = [];
    const entry = Object.entries(args);

    for(const [table, {time}] of entry)
    {
        if(typeof time != 'number') error(422, `Missing/Invalid value "args[${table}].time"`);
        
        switch(table) {
        case 'logs': trans.push(querys.getLogsSingle.bind(time, id)); break;
            
        case 'user':  trans.push(querys.getUserSingle.bind(time, id)); break;
        case 'class': trans.push(querys.getClassSingle.bind(time, cId)); break;
            
        case 'teams':  trans.push(querys.getTeamSingle.bind(time, cId)); break;
        case 'prices': trans.push(querys.getPriceSingle.bind(time, cId)); break;
            
        case 'placedBids': trans.push(querys.getPlacedBidsSingle.bind(time, id)); break;
        case 'activeBids': trans.push(querys.getActiveBidsSingle.bind(time, cId)); break;

        case 'leadWealth': trans.push(querys.getLeadWealthSingle.bind(cId)); break;
        case 'leadEarned': trans.push(querys.getLeadEarnedSingle.bind(cId)); break;

        default: error(422, `Unknown table "${table}"`);
        }
    }

    const res = await save_database(trans);
    const resObj = res.reduce((p,c,i) => { p[entry[i][0]] = c.results ?? []; return p; }, {}); 

    for(const [table, {ids}] of entry) {
        const obj = resObj[table];

        if(table.startsWith('lead')) {
            obj.forEach((v,i) => { v.id = i+1; });
            data[table] = { old: [1,2,3], data: obj };
        } 
        else if(['user','class'].includes(table)) {
            data[table] = { old: [], data: obj };
        }
        else {
            verify_array_type(ids, 'number', `args[${table}].ids`);
            const cur = (await env['eCoin_DB']?.prepare(`SELECT id FROM ${table}`).raw()).flat();
    
            data[table] = { old: ids.filter(v => !cur.includes(v)), data: obj };
        }
    }

    return Response.json(data);
}


/**
 * @param {{id: number, cId: number, balance: number}} user
 * @param {{pId: number, amount: number, notes?: string}} args 
 */
async function user_command_trans({id, cId, balance}, {pId, amount, notes})
{
    if(typeof pId != 'number') error(422, 'Missing/Malformed value: args.pId');
    if(typeof amount != 'number') error(422, 'Missing/Malformed value: args.amount');

    const p = await validate_price(pId, cId, ['Purchase']);


    const now = Date.now();
    amount = Math.max(~~amount, 1);

    const total = amount * p.cost;
    if((balance + total) < 0) error(422, 'Not enough eCoins');


    const trans = [
        querys.userTransact.bind(total, now, id),
        querys.addPurchase.bind(id, cId, p.desc, notes ?? '', amount, now),
        querys.addLog.bind(id, p.desc, p.type, notes ?? '', balance+total, total, now)
    ];

    return save_database(trans).then(v => Response.json({}));
}


/**
 * @param {{id: number, cId: number}} user 
 * @param {{bId: number, amount: number}} args 
 * @returns 
 */
async function user_command_bid({id, cId}, {bId, amount})
{
    if(typeof bId != 'number') error(422, "Missing/Malformed value: args.bId");
    if(typeof amount != 'number') error(422, "Missing/Malformed value: args.amount");
    
    const b = await querys.getBidById.bind(bId).first();

    if(!b) error(422, 'Invalid price identifier');
    if(b.cId !== cId) error(422, 'Mismatching class identifiers');


    const now = Date.now();
    amount = Math.floor(Math.max(amount, 0));
    
    if((b.amount + amount) < 0) error(422, 'Bid not high enough');
    querys.addPlacedBid.bind(id, cId, bId, amount, now).run();

    return Response.json({});
}


/** @type {import('../$types').RequestHandler} */
export async function POST({cookies, request, params})
{
    const args = await request.json(); 
    if(params.cmd === 'auth') return auth_user_request(args);
    
    const userId = validate_token(cookies, activeUsers);

    const user = await querys.getUserById.bind(userId).first();
    if(!user) error(500, "User cannot be found");
    

    switch(params.cmd)
    {
    case 'ping': return Response.json(Date.now());
    case 'get': return user_command_get(user, args);

    case 'bid': return user_command_bid(user, args);
    case 'trans': return user_command_trans(user, args);
    }

    error(422, `Invalid command: ${params.cmd}`);
}