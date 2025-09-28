'use strict';

const AbstractRequest = require('./AbstractRequest')

module.exports = class OtpRequest extends AbstractRequest {

    constructor(){
        super();
        this.reference_id = null;
        this.subscriber = null;
        this.code_length = null;
        this.code_type = null;
        this.callback_url = null;
        this.expire = null;
        this.message = null;
    }

    getCreateBody(){
        return JSON.stringify(this, replacer);
    }

};

function replacer(key,value)
{
    if (value === null) return undefined
    return value
}