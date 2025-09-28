'use strict';

var ResultInfo = require('./../Response/ResultInfo');

module.exports = class OtpVerifyResponse {

    constructor(arrayValues){
        this.request_id = '';
        this.result_info = '';
        this.assignResponse(arrayValues);

        return this;
    }

    assignResponse(arrayValues){
        if (typeof arrayValues.request_id !== 'undefined') {
            this.request_id = arrayValues.request_id;
        }
        if (typeof arrayValues.result_info !== 'undefined') {
            this.result_info = new ResultInfo(arrayValues.result_info);
        }
    }


};
