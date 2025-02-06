"use strict";

import { redirect } from "@sveltejs/kit";
import { validate_token, activeUsers } from '$lib/server/auth';


const getInitString =
(function ()
{
    const initArray = 'class-user-teams-prices-logs-leadWealth-leadEarned-activeBids-placedBids'.split('-');
    return JSON.stringify(Object.fromEntries(initArray.map(v => [v, { time:0, ids:[] }])));
})();


/** @type {import("./$types").PageServerLoad} */
// Loads database stuff berfore page loads to keep things simpler on frontend

export async function load({cookies, fetch})
{
    try { validate_token(cookies, activeUsers); } catch { redirect(302, '/user/login'); }
    return { initData: await fetch('/user/api/get', { body: getInitString, method: 'POST' }).then(v => v.json()) };
}