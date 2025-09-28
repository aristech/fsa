'use strict';

module.exports = class BounceResponse {
    constructor(arrayValues){
        this.assignResponse(arrayValues);
    }
    assignResponse(arrayValues){
        Object.assign(this, arrayValues);
    }
};