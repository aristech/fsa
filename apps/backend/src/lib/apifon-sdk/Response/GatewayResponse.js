'use strict';

var ResultInfo = require('./../Response/ResultInfo');
var ResultDetail = require('./../Response/ResultDetail');

module.exports = class GatewayResponse {

    constructor(arrayValues){
        this.request_id = '';
        this.reference_id = '';
        this.results = {};
        this.result_info = '';
        this.assignResponse(arrayValues);

        return this;
    }

    assignResponse(arrayValues){
        if (typeof arrayValues.request_id !== 'undefined') {
            this.request_id = arrayValues.request_id;
        }
        if (typeof arrayValues.reference !== 'undefined') {
            this.reference_id = arrayValues.reference;
        }
        if (typeof arrayValues.reference_id !== 'undefined') {
            this.reference_id = arrayValues.reference_id;
        }
        if (typeof arrayValues.results !== 'undefined') {
            var results = [];
            for (var k in arrayValues.results) {
                var resList = [];
                var res = arrayValues.results[k];
                if(res instanceof Array){
                    res.forEach(function(s){
                        var resDetail = new ResultDetail(s);
                        resList.push(resDetail);
                    });
                }
                else{
                    var resDetail = new ResultDetail(res);
                    resList.push(resDetail);
                }
                this.results[k] = resList;
            }
        }
        if (typeof arrayValues.result_info !== 'undefined') {
            this.result_info = new ResultInfo(arrayValues.result_info);
        }
    }


};
