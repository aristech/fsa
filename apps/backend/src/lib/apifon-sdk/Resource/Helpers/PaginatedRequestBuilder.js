'use strict';

const PaginatedRequest = require('./PaginatedRequest');

module.exports = class PaginatedRequestBuilder extends PaginatedRequest{
    setPage(page){
        if(page<0){
        //    throw exception Parameter page must be a positive value.
            return
        }
        this.page = page;
        return this;
    }
    setSize(size){
        if(size<0){
            //    throw exception Parameter size must be a positive value.
            return
        }
        this.size = size;
        return this;
    }
    setSort(sortField, sortDirection){
        this.sort_dir = sortDirection;
        this.sort_field = sortField;
        return this;
    }
    build(){}

};