'use strict';

module.exports =  class ResultDetail {

    constructor(arrayValues) {
        this.message_id = arrayValues.message_id;
        this.custom_id = arrayValues.custom_id;
        this.length = arrayValues.length;
        this.short_code = arrayValues.short_code;
        this.short_url = arrayValues.short_url;
    }
};