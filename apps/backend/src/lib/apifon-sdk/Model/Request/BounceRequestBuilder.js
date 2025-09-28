'use strict';

class BounceRequest{
    constructor(builder){
        this.destination = builder.destination;
        this.reason = builder.reason;
        this.description = builder.description;
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

module.exports = class BounceRequestBuilder{
    destination = null;
    reason = null;
    description = null;
    constructor(destination, reason){
        this.destination = destination;
        this.reason = reason;
    }
    getBounceRequestBuilder(destination, reason){
        return new BounceRequestBuilder(destination, reason)
    }
    withDescription(description){
        this.description = description;
        return this;
    }
    build(){
        return new BounceRequest(this)
    }
};