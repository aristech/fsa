'use strict';
const SubscriberGdprField = require('../SubscriberGdprField');
class SubscriberRequest{
    constructor(builder) {
        this.listId = builder.listId;
        this.etag = builder.etag;
        this.destination = builder.destination;
        this.status = builder.status;
        this.email = builder.email;
        this.email_status = builder.email_status;
        this.subscriber_fields = builder.subscriber_fields;
        this.gdpr_fields = builder.gdpr_fields;
        this.lookupMD5 = builder.lookupMD5;
        this.groupOptions = builder.groupOptions;
    }
    getBody(){
        return JSON.stringify(this, replacer);
    }
}
function replacer(key,value)
{
    if (value instanceof Map){
        var mp = {};
        value.forEach((value,key)=>mp[key]=value);
        return mp}
    if (value === null) return undefined;
    return value
}
module.exports = class SubscriberRequestBuilder{
    listId = null;
    etag = null;
    destination = null;
    status = null;
    email = null;
    email_status = null;
    subscriber_fields = null;
    gdpr_fields = null;
    lookupMD5 = null;
    groupOptions = null;

    constructor(listId = null) {
        this.listId = listId;
        this.subscriber_fields = new Map();
        this.gdpr_fields = new Map();
    }
    getBuilderFromSubscriber(subscriber){
        return new SubscriberRequestBuilder(subscriber.list_id)
            .withDestination(subscriber.destination, subscriber.status)
            .withEmail(subscriber.email, subscriber.email_status)
            .withSubscriberFields(subscriber.subscriber_fields)
            .withGdprFields(subscriber.gdpr_fields)
            .withLookupMD5((subscriber.destination_id === null)? subscriber.email_id : subscriber.destination_id)
    }
    getAddSubscriberRequestBuilder(listId){
        return new SubscriberRequestBuilder(listId);
    }
    withLookupMD5(lookupMD5){
        this.lookupMD5 = lookupMD5;
        return this;
    }
    withDestination(destination, status){
        this.destination = destination;
        this.status = status;
        return this;
    }
    withEmail(email, emailStatus){
        this.email = email;
        this.email_status = emailStatus;
        return this;
    }
    withStatus(status){
        this.status = status;
        return this;
    }
    withEmailStatus(emailStatus){
        this.emailStatus = emailStatus;
        return this;
    }
    withEtag(etag){
        this.etag = etag;
        return this;
    }
    clearSubscriberFields(){
        this.subscriber_fields.clear();
        return this;
    }
    withSubscriberField(field, value){
        this.subscriber_fields.set(field, value);
        return this;
    }
    withSubscriberFields(subscriberFields){
        for(let field in subscriberFields){
            this.subscriber_fields.set(field, subscriberFields[field]);
        }
        // subscriberFields.forEach((value, key) => this.subscriber_fields.set(key, value));
        return this;
    }
    clearGdprFields(){
        this.gdpr_fields.clear();
    }
    withGdprField(field, gdprCompliance){
        if (this.gdpr_fields.has(field)){
            this.gdpr_fields.get(field).mobile = gdprCompliance;
            this.gdpr_fields.get(field).email = gdprCompliance;
        }else{
            var newGdprField = new  SubscriberGdprField();
            newGdprField.mobile = gdprCompliance;
            newGdprField.email = gdprCompliance;
            this.gdpr_fields.set(field, newGdprField);
        }
        return this;
    }
    withMobileGdprField(field, gdprCompliance){
        if (this.gdpr_fields.has(field)){
            this.gdpr_fields.get(field).mobile = gdprCompliance;
        }else{
            var newGdprField = new  SubscriberGdprField();
            newGdprField.mobile = gdprCompliance;
            this.gdpr_fields.set(field, newGdprField);
        }
        return this;
    }
    withEmailGdprField(field, gdprCompliance){
        if (this.gdpr_fields.has(field)){
            this.gdpr_fields.get(field).email = gdprCompliance;
        }else{
            var newGdprField = new  SubscriberGdprField();
            newGdprField.email = gdprCompliance;
            this.gdpr_fields.set(field, newGdprField);
        }
        return this;
    }
    withGdprFields(gdprFields){
        // gdprFields.forEach((value, key) => this.gdpr_fields.set(key, value));
        for(let field in gdprFields){
            this.gdpr_fields.set(field, gdprFields[field]);
        }
        return this;
    }

    withGroupOptions(groupOptions){
        this.groupOptions = groupOptions;
        return this;
    }
    build(){return new SubscriberRequest(this)}
};