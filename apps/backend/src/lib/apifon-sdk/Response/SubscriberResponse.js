'use strict';

const GdprFieldResponse = require('./GdprFieldResponse');
const SubscriberFieldResponse = require('./SubscriberFieldResponse');

module.exports = class SubscriberResponse {
    constructor(arrayValues){
        this.assignResponse(arrayValues);
    }
    assignResponse(arrayValues){
        Object.assign(this, arrayValues);

        if (typeof arrayValues.groupOptions !== 'undefined') {
            let optionsArray = [];
            if(arrayValues.groupOptions instanceof Array){
                arrayValues.groupOptions.forEach(function(item) {
                    optionsArray.push(item);
                });
            }
            this.groupOptions = optionsArray;
        }
        // if (typeof arrayValues.gdpr_fields !== 'undefined'){
        //     this.gdpr_fields = {};
        //     // arrayValues.gdpr_fields.map(result => this.gdpr_fields.push(new GdprFieldResponse(result)));
        //     for
        // }
        // if (typeof arrayValues.subscriber_fields !== 'undefined'){
        //     this.subscriber_fields = {};
        //     arrayValues.subscriber_fields.map(result => this.subscriber_fields.push(new SubscriberFieldResponse(result)));
        // }
    }
};