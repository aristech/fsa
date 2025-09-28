'use strict';

const AbstractRequest = require('./AbstractRequest')

module.exports = class RemoveRequest extends AbstractRequest {

    constructor(){
        super();
        this.id = null;
        this.field = null;
    }

    getBody(){
        return JSON.stringify(this);
    }

};