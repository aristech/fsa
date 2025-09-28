'use strict';

module.exports = class PagingLinks{
    prev = null;
    next = null;
    first = null;
    last = null;
    constructor(arrayValues){
        this.assignResponse(arrayValues);
    }
    assignResponse(arrayValues){
        if (typeof arrayValues !== 'undefined') {
            Object.assign(this, arrayValues);
        }
    }
};