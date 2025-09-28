'use strict';
const {CampaignDefaults,CampaignDefaultsBuilder} = require('../Model/Request/CampaignDefaultsBuilder');
const {GdprProperties,GdprPropertiesBuilder} = require('../Model/Request/GdprPropertiesBuilder');
const SubscriberFieldResponse = require('./SubscriberFieldResponse');
const GdprFieldResponse = require('./GdprFieldResponse');
const GroupResponse = require('./GroupResponse');

module.exports = class ListResponse {
    constructor(arrayValues){
        this.assignResponse(arrayValues);
    }
    assignResponse(arrayValues){
        Object.assign(this, arrayValues);
        if (typeof arrayValues.campaign_defaults !== 'undefined'){
            this.campaign_defaults = new CampaignDefaults(arrayValues.campaign_defaults)
        }
        if (typeof arrayValues.subscriber_fields !== 'undefined'){
            this.subscriber_fields = [];
            arrayValues.subscriber_fields.map(result => this.subscriber_fields.push(new SubscriberFieldResponse(result)));
        }
        if (typeof arrayValues.gdpr_fields !== 'undefined'){
            this.gdpr_fields = [];
            arrayValues.gdpr_fields.map(result => this.gdpr_fields.push(new GdprFieldResponse(result)));
        }
        if (typeof arrayValues.gdpr_properties !== 'undefined'){
            this.gdpr_properties = new GdprProperties(arrayValues.gdpr_properties);
        }
        if (typeof arrayValues.groups !== 'undefined') {
            let groupArray = [];
            if(arrayValues.groups instanceof Array){
                arrayValues.groups.forEach(function(item) {
                    groupArray.push(new GroupResponse(item));
                });
            }
            this.groups = groupArray;
        }
    }
};