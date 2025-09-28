'use strict';
module.exports = class ApifonRestException extends  Error{
    constructor(msg){
        super();
        this.resp = msg
    }
    toString(){
        return JSON.stringify(this.resp);
    }
};