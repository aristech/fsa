'use strict';

const AbstractResource = require('././AbstractResource');

module.exports = class GdprFieldResource extends AbstractResource {
    constructor() {
        super("/services/api/v1/list/{list_id}/gdpr")
    }
    replacePlaceholderAndSetUrl(suffix, listId){
        this.curEndpoint = (this.endpoint + suffix).replace("{list_id}", listId)
    }
    addGdprField(request){
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
    }
    updateGdprField(request){
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
};