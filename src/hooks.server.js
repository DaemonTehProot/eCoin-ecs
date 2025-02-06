"use strict";

if(!Array.prototype.toReversed)
{
    Array.prototype.toReversed =
        function() { return this.slice().reverse() }
}

if(!Array.prototype.toSorted)
{
    Array.prototype.toSorted = 
        function(fn) { return this.slice().sort(fn) }
}