'use strict';

class SubscriberFieldRequest{
    constructor(builder) {
        this.field = builder.field;
        this.length = builder.length;
        this.name = builder.name;
        this.type = builder.type;
        this.date_format = builder.dateFormat;
        this.internal = builder.internal;
        this.listId = builder.listId;
        this.etag = builder.etag;
    }
    getBody(){
        return JSON.stringify(this, replacer);
    }
}
function replacer(key,value)
{
    if (value === null) return undefined;
    return value
}
module.exports = class SubscriberFieldRequestBuilder{
    field = null;
    length = null;
    name = null;
    type = null;
    dateFormat = null;
    internal = null;
    listId = null;
    etag = null;
    constructor(listId, type, length, name){
        this.listId = listId;
        if (length === undefined)
            this.field = type;
        else{
            this.internal = false;
            this.type = type;
            this.length = length;
            this.name = name;
        }
    }
    getUpdateSubscriberFieldRequestBuilder(listId, field, name, length){
        if(typeof(field)==="string"){
            //check that the values exist
            return new SubscriberFieldRequestBuilder(listId, field)
                .withName(name)
                .withLength(length)
        }else{
            return new SubscriberFieldRequestBuilder(listId, field.field, field.length, field.name)
                .withDateFormat(field.date_format)
                .withInternal(field.internal)
        }

    }
    getAddRequestBuilder(listId, type, length, name){
        return new SubscriberFieldRequestBuilder(listId, type, length, name);
    }

    withName(name){
        this.name = name;
        return this;
    }
    withLength(length){
        this.length = length;
        return this;
    }
    withDateFormat(dateFormat){
        this.dateFormat = dateFormat;
        return this;
    }
    withInternal(internal){
        this.internal = internal;
        return this;
    }
    withListEtag(listEtag) {
        this.etag = listEtag;
        return this;
    }
    build(){
        return new SubscriberFieldRequest(this);
    }
}