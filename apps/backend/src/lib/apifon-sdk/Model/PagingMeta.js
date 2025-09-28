'use strict';

module.exports = class PagingMeta{
    page = null;
    size = null;
    total = null;
    constructor(arrayValues){
        this.assignResponse(arrayValues);
    }
    assignResponse(arrayValues){
        if (typeof arrayValues !== 'undefined') {
            Object.assign(this, arrayValues);
        }
    }
};