"use strict";

import { error } from '@sveltejs/kit';

import { querys, save_database } from './database';
import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';

/** @type {(status: number, message: string) => Response} */
const asyncError = (status, message) => Response.json({ message }, { status });

/** @type {Map<string, {timer: number, ctx: unknown}>} */ export const activeUsers = new Map();
/** @type {Map<string, {timer: number, ctx: unknown}>} */ export const activeAdmins = new Map();



/**
 * 
 * @param {string} pass
 * @param {string|undefined} passNew 
 * @param {string} creds 
 * @param {Map<string, {ctx:unknown, timer:NodeJS.Timeout}>} tokMap 
 * @param {string} path
 * @param {unknown} ctx 
 * 
 * @returns {Promise<Response>}
 */
export function auth_generic_request(pass, passNew, creds, tokMap, path, ctx)
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
            const oToken = { ctx: ctx, timer: setTimeout(() => tokMap.delete(sToken), 4.32e+7) }; // 12hr no exceptions
            
            if(passNew) 
            {
                const hashed = create_password(passNew);
                await save_database([
                    !ctx ? 
                        querys.updateAdminPass.bind(hashed) :
                        querys.updateUserPass.bind(hashed, ctx)
                ]);
            }

            tokMap.set(sToken, oToken);
            resolve(new Response(sToken, { headers: { 'Set-Cookie': `sessionId=${sToken};Path=${path};SameSite=Lax;Max-Age=43200` } }));
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
 * @param {Map<string, {ctx: unknown, timer: number}>} tokMap 
 */
export function validate_token(cookie, tokMap)
{
    let sToken, oToken;

    if(!(sToken = cookie.get('sessionId'))) error(400, 'Missing Token');
    if(!(oToken = tokMap.get(sToken))) error(422, 'Invalid Token');

    return oToken.ctx;
}