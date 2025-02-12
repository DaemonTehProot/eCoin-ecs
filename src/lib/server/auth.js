"use strict";

import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

import { querys, save_database } from './database';
import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';

/** @type {(status: number, message: string) => Response} */
const asyncError = (status, message) => Response.json({ message }, { status });

/** @type {Map<string, {timer: NodeJS.Timeout, ctx: unknown}>} */ export const activeUsers = new Map();
/** @type {Map<string, {timer: NodeJS.Timeout, ctx: unknown}>} */ export const activeAdmins = new Map();



/**
 * 
 * @param {string} pass
 * @param {string|undefined} passNew 
 * @param {string} creds 
 * @param {string} tokTable 
 * @param {string} path
 * @param {unknown} ctx 
 * 
 * @returns {Promise<Response>}
 */
export function auth_generic_request(pass, passNew, creds, tokTable, path, ctx)
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

            const sToken = crypto.randomUUID(); // should be safe enough
            
            if(passNew) 
            {
                const hashed = create_password(passNew);
                await save_database([
                    !ctx ? 
                        querys.updateAdminPass.bind(hashed) :
                        querys.updateUserPass.bind(hashed, ctx)
                ]);
            }

            if(tokTable === 'admin') { await querys.addAdminToken.bind(sToken).run(); } 
            else { await querys.addUserToken.bind(ctx, sToken).run(); }

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
 * 
 * @param {import('@sveltejs/kit').Cookies} cookie
 * @param {string} tokTable 
 */
export async function validate_token(cookie, tokTable)
{
    if(tokTable === 'admin') {
        const stmt = querys.getAdminToken.bind(cookie.get('sessionId'));
        const _tok = (await stmt.first())?.token;

        if(_tok) { return _tok; }
    } 
    else {
        const stmt = querys.getUserToken.bind(cookie.get('sessionId'));
        const user = (await stmt.first())?.uId;
        
        if(user) { return user; } 
    }

    error(422, "Session not started");
}