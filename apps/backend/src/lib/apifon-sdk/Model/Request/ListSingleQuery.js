'use strict';
const AbstractSingleQuery = require('./AbstractSingleQuery');
module.exports = class ListSingleQuery extends AbstractSingleQuery{
    listId = null;
    fields = [];
    etag = null;
    constructor(listId){
        super();
        this.listId = listId;
        this.fields = [];
    }
    getListRequest(listId){
        //check that the values exist
        return new ListSingleQuery(listId);
    }
    withEtag(etag){
        this.etag = etag;
        return this;
    }
};