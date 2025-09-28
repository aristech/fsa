'use strict';
const PaginatedRequest = require('../../Resource/Helpers/PaginatedRequest');
const PaginatedRequestBuilder = require('../../Resource/Helpers/PaginatedRequestBuilder');

class BounceSubscribersQueryRequest extends PaginatedRequest{
    type = null;
    reason = null;
    fields = [];
    constructor(builder){
        super();
        this.type = builder.type;
        this.reason = builder.reason;
        this.fields = builder.fields;
        this.size = builder.size;
        this.page = builder.page;
        this.sort_field = builder.sort_field;
        this.sort_dir = builder.sort_dir;
    }
    toQueryParamRequest() {
        var queryParams = {};
        this.addQueryParams(queryParams);
        if(this.type !== null){
            queryParams["type"] = this.type;
        }
        if(this.reason !== null){
            queryParams["reason"] = this.reason;
        }
        if(this.fields !== null && this.fields.length !==0){
            queryParams["fields"] = this.fields.join(',');
        }
        return this.getQueryParams(queryParams);
    }
    getQueryParams(queryParamsIn){
        const queryParams = [];
        for (let d in queryParamsIn)
            queryParams.push(encodeURIComponent(d) + '=' + encodeURIComponent(queryParamsIn[d]));
        return '?' + queryParams.join('&');
    }
}

module.exports = class BounceQueryBuilder extends PaginatedRequestBuilder{
    type = null;
    reason = null;
    fields = [];
    constructor(){
        super();
        this.size = 200;
    }
    getBuilder(){
        return new BounceQueryBuilder()
    }
    withType(type){
        this.type=type;
        return this;
    }
    withReason(reason){
        this.reason = reason;
        return this;
    }
    toQueryParamRequest(){
        return new BounceSubscribersQueryRequest(this).toQueryParamRequest();
    }
    build(){
        return new BounceSubscribersQueryRequest(this)
    }
    addVisibleField(field){
        this.fields.push(field);
        return this;
    }
    addVisibleFields(fields){
        fields.forEach(field =>{this.fields.push(field)});
        return this;
    }
};