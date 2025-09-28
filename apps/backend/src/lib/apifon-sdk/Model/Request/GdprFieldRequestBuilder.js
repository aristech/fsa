'use strict';

class GdprFieldRequest{
    constructor(builder){
        this.listId = builder.listId;
        this.field = builder.field;
        this.name = builder.name;
        this.description = builder.description;
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
module.exports = class GdprFieldRequestBuilder{
    listId = null;
    field = null;
    name = null;
    description = null;
    etag = null;
    constructor(name, listId){
        this.name = name;
        this.listId = listId;
    }
    getAddGdprFieldRequestBuilder(name, listId){
        return new GdprFieldRequestBuilder(name, listId);
    }
    getUpdateGdprFieldRequestBuilder(name, listId, field){
        return new GdprFieldRequestBuilder(name, listId)
            .withField(field);
    }
    withDescription(description){
        this.description = description;
        return this;
    }
    withEtag(etag){
        this.etag = etag;
        return this;
    }
    withName(name){
        this.name = name;
        return this;
    }
    withField(field){
        this.field = field;
        return this;
    }
    build(){return new GdprFieldRequest(this)}
};