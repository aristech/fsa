'use strict';

const PaginatedResponse = require('./PaginatedResponse');
const ListResponse = require('../Response/ListResponse');
const SubscriberResponse = require('../Response/SubscriberResponse');
const BounceResponse = require('../Response/BounceResponse');

module.exports = class CollectionEntityResponse extends PaginatedResponse{
    // results = []<ListResponse>{}
    constructor(arrayValues, type){
        super(arrayValues);
        this.results = [];
        this.assignResponse(arrayValues, type);
    }
    assignResponse(arrayValues, type){
        switch (type) {
            case 'lists':
                if (typeof arrayValues.results !== 'undefined'){
                    arrayValues['results'].map(result => this.results.push(new ListResponse(result)));
                }
                break;
            case 'subscribers':
                if (typeof arrayValues.results !== 'undefined'){
                    arrayValues['results'].map(result => this.results.push(new SubscriberResponse(result)));
                }
                break;
            case 'bounce':
                if (typeof arrayValues.results !== 'undefined'){
                    arrayValues['results'].map(result => this.results.push(new BounceResponse(result)));
                }
                break;
        }
    }
};