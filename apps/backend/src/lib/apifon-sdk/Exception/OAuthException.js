'use strict';
const ApifonRestException = require('./ApifonRestException');

module.exports = class OAuthException extends  ApifonRestException{
    constructor(msg){
        super(msg);
    }
    toString(){
        return JSON.stringify(this.resp);
    }
};