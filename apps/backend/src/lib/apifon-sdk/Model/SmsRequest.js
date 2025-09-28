'use strict';

const SubscribersViewRequest = require('./SubscribersViewRequest')

module.exports = class SmsRequest extends SubscribersViewRequest {

    constructor(){
        super();
        this.reference_id = null;
        this.message = null;
        this.callback_url = null;
        this.tte = null;
        this.date = null;
    }

    getBody(){
        return JSON.stringify(this, replacer);
    }

};

function replacer(key,value)
{
    if (value === null) return undefined
    return value
}