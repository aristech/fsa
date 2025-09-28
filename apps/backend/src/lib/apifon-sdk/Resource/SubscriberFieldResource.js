'use strict';

const AbstractResource = require('././AbstractResource');

module.exports = class SubscriberFieldResource extends AbstractResource {
    constructor() {
        super("/services/api/v1/list/{list_id}/field")
    }
    replacePlaceholderAndSetUrl(suffix, listId){
        this.curEndpoint = (this.endpoint + suffix).replace("{list_id}", listId)
    }
    addSubscriberField(request){
        this.curMethod = "POST";
        this.replacePlaceholderAndSetUrl("/", request.listId);
        // this.addEtagHeader(request.etag);
        if(typeof request === 'string'){
            this.curBody = request;
        }
        else{
            this.curBody = request.getBody();
        }
        var response = this.dispatchToResponse();
        return response.statusCode === 201;
        // return new URL(response.headers.location);
    }
    updateSubscriberField(request){
        this.curMethod = "PUT";
        this.replacePlaceholderAndSetUrl("/" + request.field, request.listId);
        // this.addEtagHeader(request.etag);
        if(typeof request === 'string'){
            this.curBody = request;
        }
        else{
            this.curBody = request.getBody();
        }
        var response = this.dispatchToResponse();
        return response.statusCode === 200;
    }
    removeSubscriberField(listId, field){
        this.curMethod = "DELETE";
        this.replacePlaceholderAndSetUrl("/" + field, listId);
        this.curBody = "";
        var response = this.dispatchToResponse();
        return this.isSuccessful(response);
    }
};