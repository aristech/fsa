'use strict';

const PaginatedRequest = require('../../Resource/Helpers/PaginatedRequest');
const PaginatedRequestBuilder = require('../../Resource/Helpers/PaginatedRequestBuilder');

class ListQueryRequest extends PaginatedRequest{
    type = null;
    fields = [];
    constructor(builder){
        super();
        this.type = builder.type;
        this.fields = builder.fields;
        this.size = builder.size;
        this.page = builder.page;
        this.sort_field  = builder.sort_field;
        this.sort_dir = builder.sort_dir;
    }
    toQueryParamRequest() {
        var queryParams = {};
        this.addQueryParams(queryParams);
        if(this.type !== null){
            queryParams["type"] = this.type;
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


module.exports = class ListQueryBuilder extends PaginatedRequestBuilder{
    type = null;
    fields = [];
    constructor() {
        super();
        this.fields = [];
    }
    getBuilder(){return new ListQueryBuilder()};
    withType(type){
        this.type = type;
        return this;
    }
    toQueryParamRequest(){
        return new ListQueryRequest(this).toQueryParamRequest();
    }
    build(){
        return new ListQueryRequest(this);
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