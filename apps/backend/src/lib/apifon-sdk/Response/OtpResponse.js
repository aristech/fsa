'use strict';

var ResultInfo = require('./../Response/ResultInfo');
var ResultDetail = require('./../Response/ResultDetail');

module.exports = class OtpResponse {

    constructor(arrayValues){
        this.request_id = '';
        this.reference_id = '';
        this.result = [];
        this.result_info = '';
        this.assignResponse(arrayValues);

        return this;
    }

    assignResponse(arrayValues){
        if (typeof arrayValues.request_id !== 'undefined') {
            this.request_id = arrayValues.request_id;
        }
        if (typeof arrayValues.reference !== 'undefined') {
            this.reference = arrayValues.reference;
        }
        if (typeof arrayValues.result !== 'undefined') {
            for (var k in arrayValues.result) {
                var resList = [];
                var resDetail = new ResultDetail(arrayValues.result[k]);
                resList.push(resDetail);
                this.result= resList;
            }
        }
        if (typeof arrayValues.result_info !== 'undefined') {
            this.result_info = new ResultInfo(arrayValues.result_info);
        }
    }


};
