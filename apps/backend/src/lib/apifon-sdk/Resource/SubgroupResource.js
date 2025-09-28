
const AbstractResource = require('././AbstractResource');
const SubgroupResponse = require('../Response/SubgroupResponse');

module.exports = class SubgroupResource extends AbstractResource{
    constructor() {
        super("/services/api/v1/list/{list_id}/{group_field}");
    }

    replacePlaceholderAndSetUrl(suffix, listId, groupField){
        let tempEndpoint = (this.endpoint + suffix).replace("{list_id}", listId)
        this.curEndpoint = tempEndpoint.replace("{group_field}", groupField)
    }

    addSubgroup(request){
        this.curMethod = "POST";
        this.replacePlaceholderAndSetUrl("/option", request.listId,request.groupField);
        if(typeof request === 'string'){
            this.curBody = request;
        }
        else{
            this.curBody = request.getBody();
        }
        let response = this.dispatchToResponse();
        return new URL(response.headers.location);
    }

    addSubgroups(request){
        this.curMethod = "POST";
        this.replacePlaceholderAndSetUrl("/options", request.listId,request.groupField);
        if(typeof request === 'string'){
            this.curBody = request;
        }
        else{
            this.curBody = request.getBody();
        }
        let response = this.dispatchToResponse();
        return new URL(response.headers.location);
    }

    getSubgroup(request){
        this.curMethod = "GET";
        this.replacePlaceholderAndSetUrl("/option/" + request.optionsField,request.listId,request.groupField);
        this.curBody = "";
        let response = this.dispatchToResponse();
        let responseString = response.getBody('utf8');
        return new SubgroupResponse(JSON.parse(responseString))
    }

    updateSubgroup(request){
        this.curMethod = "PUT";
        this.replacePlaceholderAndSetUrl("/"+ request.optionsField, request.listId,request.groupField);
        if(typeof request === 'string'){
            this.curBody = request;
        }
        else{
            this.curBody = request.getBody();
        }
        let response = this.dispatchToResponse();
        return new URL(response.headers.location);
    }

    removeSubgroup(listId, groupField, oprionsField){
        this.curMethod = "DELETE";
        this.replacePlaceholderAndSetUrl("/" + oprionsField, listId, groupField);
        this.curBody = "";
        let response = this.dispatchToResponse();
        return this.isSuccessful(response);
    }

    getByResourceUri(resourceUri){
        this.curMethod = "GET";
        this.curEndpoint = resourceUri.pathname;
        this.curBody = "";
        let resp = this.dispatchToResponse();
        let responseString = resp.getBody('utf8');
        return new SubgroupResponse(JSON.parse(responseString))
    }
}