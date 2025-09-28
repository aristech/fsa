'use strict';

module.exports = class SubscriberFieldResponse{
    // field = null;
    // length = null;
    // name = null;
    // type = null;
    // date_format = null;
    // internal = null;
    constructor(arrayValues){
        Object.assign(this, arrayValues);
    }
};