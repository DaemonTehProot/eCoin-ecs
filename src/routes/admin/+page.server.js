"use strict";

import { redirect } from "@sveltejs/kit";
import { validate_token } from "$lib/server/auth";


const getInitString =
(function ()
{
    const initArray = 'classes-users-teams-prices-placedBids-activeBids-purchases'.split('-');
    return JSON.stringify(Object.fromEntries(initArray.map(v => [v, { time:0, ids:[] }])));
})();


/** @type {import("./$types").PageServerLoad} */
export async function load({cookies, fetch})
{
    try { validate_token(cookies, 'activeAdmins'); } catch { redirect(302, "/admin/login"); }
    return { initData: await fetch('/admin/api/get', { body: getInitString, method: 'POST' }).then(v => v.json()) };
}