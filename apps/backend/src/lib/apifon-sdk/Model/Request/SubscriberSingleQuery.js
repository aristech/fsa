'use strict';
const AbstractSingleQuery = require('./AbstractSingleQuery');
module.exports = class SubscriberSingleQuery extends AbstractSingleQuery{
    lookupMD5 = null;
    listId = null;
    fields = [];

    constructor(lookupMD5, listId) {
        super();
        this.fields = [];
        this.lookupMD5 = lookupMD5;
        this.listId = listId;
    }
    getSubscriberLookup(lookupMD5, listId){
        return new SubscriberSingleQuery(lookupMD5, listId)
    }
    // getQueryParams(){
    //     const queryParams = [];
    //     if(this.fields != null && !!Object.keys(this.fields).length) {
    //         for (let d in this.fields)
    //             queryParams.push(encodeURIComponent(d) + '=' + encodeURIComponent(this.fields[d]));
    //     }
    //     return queryParams.join('&');
    // }
    /*
    todo: add visible fields
     */
};