'use strict';
const PaginatedRequest = require('../../Resource/Helpers/PaginatedRequest');
const PaginatedRequestBuilder = require('../../Resource/Helpers/PaginatedRequestBuilder');

class SubscriberQueryRequest extends PaginatedRequest{
    listId = null;
    status = null;
    emailStatus = null;
    fields = [];
    constructor(builder){
        super();
        this.listId = builder.listId;
        this.status = builder.status;
        this.emailStatus = builder.emailStatus;
        this.fields = builder.fields;
        this.page = builder.page;
        this.size = builder.size;
        this.sortDir = builder.sortDir;
        this.sortField = builder.sortField;
    }
    toQueryParamRequest() {
        var queryParams = {};
        this.addQueryParams(queryParams);
        if(this.status !== null){
            queryParams["status"] = this.status;
        }
        if(this.emailStatus !== null){
            queryParams["email_status"] = this.emailStatus;
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

module.exports = class SubscriberQueryBuilder extends PaginatedRequestBuilder{
    listId = null;
    status = null;
    emailStatus = null;
    fields = [];
    constructor(listId){
        super();
        this.listId = listId;
    }
    getQueryBuilder(listId){
        return new SubscriberQueryBuilder(listId)
    }
    withStatus(status){
        this.status = status;
        return this;
    }
    withEmailStatus(emailStatus){
        this.emailStatus = emailStatus;
        return this;
    }
    build(){
        return new SubscriberQueryRequest(this)
    }
    toQueryParamRequest(){
        return this.build().toQueryParamRequest();
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