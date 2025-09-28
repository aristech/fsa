const GroupResponse = require('../Response/GroupResponse');
const AbstractResource = require('././AbstractResource');

module.exports = class GroupResource extends AbstractResource{

    constructor() {
        super("/services/api/v1/list/{list_id}/group");
    }

    replacePlaceholderAndSetUrl(suffix, listId){
        this.curEndpoint = (this.endpoint + suffix).replace("{list_id}", listId)
    }

    addGroup(request){
        this.curMethod = "POST";
        this.replacePlaceholderAndSetUrl("/", request.listId);
        if(typeof request === 'string'){
            this.curBody = request;
        }
        else{
            this.curBody = request.getBody();
        }
        let response = this.dispatchToResponse();
        return new URL(response.headers.location);
    }

    getGroup(request){
        this.curMethod = "GET";
        this.replacePlaceholderAndSetUrl("/" + request.groupField,request.listId);
        this.curBody = "";
        let response = this.dispatchToResponse();
        let responseString = response.getBody('utf8');
        return new GroupResponse(JSON.parse(responseString))
    }

    updateGroup(request){
        this.curMethod = "PUT";
        this.replacePlaceholderAndSetUrl("/"+ request.groupField, request.listId);
        if(typeof request === 'string'){
            this.curBody = request;
        }
        else{
            this.curBody = request.getBody();
        }
        let response = this.dispatchToResponse();
        return new URL(response.headers.location);
    }

    removeGroup(listId, groupField){
        this.curMethod = "DELETE";
        this.replacePlaceholderAndSetUrl("/" + groupField, listId);
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
        return new GroupResponse(JSON.parse(responseString))
    }

}