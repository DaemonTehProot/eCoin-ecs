/** @param {string} name  */
export function get_cookie(name)
{
    const sVal = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))?.at(2);
    console.log(sVal);
    return sVal;
}