"use strict";

import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

import { querys, save_database } from './database';
import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';

/** @type {(status: number, message: string) => Response} */
const asyncError = (status, message) => Response.json({ message }, { status });


/**
 * 
 * @param {string} pass
 * @param {string|undefined} passNew 
 * @param {string} creds 
 * @param {string} tokTable 
 * @param {string} path
 * @param {unknown} ctx 
 * @param {string|undefined} sessionOld
 * 
 * @returns {Promise<Response>}
 */
export function auth_generic_request(pass, passNew, creds, tokTable, path, ctx, sessionOld)
{
    if(passNew && !passNew.length) error(422, "Malformed value: args.passNew");

    return new Promise((resolve) => 
    {
        const [salt, key] = creds.split(':');
        scrypt(pass, salt, 64, async (err, userBuf) =>
        {
            if(err) return resolve(asyncError(500, "Unable to hash password"));

            const keyBuf = Buffer.from(key, 'base64');
            if(!timingSafeEqual(keyBuf, userBuf)) return resolve(asyncError(422, 'Invalid Username/Password'));

            const tasks = [];
            const sToken = crypto.randomUUID(); // should be safe enough
            
            if(passNew) 
            {
                const hashed = create_password(passNew);
                
                if(!ctx) { tasks.push(querys.updateAdminPass.bind(hashed)); }
                else { tasks.push(querys.updateUserPass.bind(hashed, ctx)); }
            }

            if(sessionOld) {
                tasks.push(env['eCoin_DB']?.prepare(`DELETE FROM ${tokTable} WHERE token=?`).bind(sessionOld));
            }

            if(tokTable === 'activeAdmins') { tasks.push(querys.addAdminToken.bind(sToken)); } 
            else if(tokTable === 'activeUsers') { tasks.push(querys.addUserToken.bind(ctx, sToken)); }

            await save_database(tasks);
            resolve(new Response(sToken, { headers: { 'Set-Cookie': `sessionId=${sToken};Path=${path};SameSite=Lax` } }));
        });
    });
}


/** @param {string} pass */
export function create_password(pass) 
{
    const salt = randomBytes(16).toString('base64');
    const buf = scryptSync(pass, salt, 64);

    return `${salt}:${buf.toString('base64')}`;
}


/**
 * @param {import('@sveltejs/kit').Cookies} cookie
 * @param {string} tokTable 
 */
export async function validate_token(cookie, tokTable)
{
    if(tokTable === 'activeAdmins') {
        const stmt = querys.getAdminToken.bind(cookie.get('sessionId'));
        const _tok = (await stmt.first())?.token;

        if(_tok) { return _tok; }
    } 
    else if(tokTable === 'activeUsers') {
        const stmt = querys.getUserToken.bind(cookie.get('sessionId'));
        const user = (await stmt.first())?.uId;
        
        if(user) { return user; } 
    }

    error(422, "Session not started");
}

/**
 * @param {import('@sveltejs/kit').Cookies} cookie
 * @param {string} tokTable
*/
export async function session_logout(cookie, tokTable)
{
    const old = cookie.get('sessionId');
    if(old) await env['eCoin_DB']?.prepare(`DELETE FROM ${tokTable} WHERE token=?`).bind(old).run();

    return Response.json({});
}