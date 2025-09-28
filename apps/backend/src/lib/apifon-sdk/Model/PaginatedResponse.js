'use strict';
const PagingMeta = require('./PagingMeta');
const PagingLinks = require('./PagingLinks');

module.exports = class PaginatedResponse{
    meta = {};
    links = {};
    constructor(arrayValues){
        if (typeof arrayValues.meta !== 'undefined'){
            this.meta = new PagingMeta(arrayValues.meta)
        }
        if (typeof arrayValues.links !== 'undefined'){
            this.links = new PagingLinks(arrayValues.links)
        }
    }
};