'use strict';

const SubscribersViewRequest = require('./SubscribersViewRequest')

module.exports = class ImRequest extends SubscribersViewRequest {

    constructor(){
        super();
        this.reference_id = null;
        this.message = null;
        this.callback_url = null;
        this.reply_url = null;
        this.im_channels = null;
        this.date = null;
    }

    addChannel(imChannel){
        if(this.im_channels == null){
            this.im_channels = [];
        }
        this.im_channels.push(imChannel);
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