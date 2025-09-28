'use strict';

const AbstractResource = require('././AbstractResource');
const ListSingleQuery = require('../Model/Request/ListSingleQuery');
const ListResponse = require('../Response/ListResponse');
const CollectionEntityResponse = require('../Model/CollectionEntityResponse');
const PagingMeta = require('../Model/PagingMeta');
const PagingLinks = require('../Model/PagingLinks');
module.exports = class ListResource extends AbstractResource {

    constructor(){
        super("/services/api/v1/list");
    }
    createList(request){
        this.curMethod = "POST";
        this.curEndpoint = this.endpoint + "/";
        if(typeof request === 'string'){
            this.curBody = request;
        }
        else{
            this.curBody = request.getBody();
        }
        var response = this.dispatchToResponse();
        return new URL(response.headers.location);
    }
    getList(request){
        this.curMethod = "GET";
        this.curEndpoint = this.endpoint + "/" + request.listId + request.getQueryParams();
        this.curBody = "";
        // this.addEtagHeader(request.etag);
        var response = this.dispatchToResponse();
        var responseString = response.getBody('utf8');
        return new ListResponse(JSON.parse(responseString))
    }

    updateList(request){
        if(request.id == null){
            //    throw error request id is not set
            return;
        }
        this.curMethod = "PUT";
        this.curEndpoint = this.endpoint + "/" + request.id;
        if(typeof request === 'string'){
            this.curBody = request;
        }
        else{
            this.curBody = request.getBody();
        }
        // this.addEtagHeader(request.etag);
        var response = this.dispatchToResponse();
        console.log(response.statusCode);
        return new URL(response.headers["content-location"]);
    }

    removeList(id){
        this.curMethod = "DELETE";
        this.curEndpoint = this.endpoint + "/" + id;
        this.curBody = "";
        var response = this.dispatchToResponse();
        return this.isSuccessful(response);
    }
    /*
    get all the lists. Paginated request
     */
    getLists(request){
        this.curMethod = "GET";
        if (typeof(request) === "string"){
            var tmpUrl = new URL(request);
            this.curEndpoint = tmpUrl.pathname + tmpUrl.search;}
        else
            this.curEndpoint = this.endpoint + request.toQueryParamRequest();
        this.curBody = "";
        var response = this.dispatchToResponse();
        return new CollectionEntityResponse(JSON.parse(response.getBody('utf8')), 'lists')
    }

    getByResourceUri(resourceUri){
        var pathParams = resourceUri.pathname.split("/");
        var listId = pathParams[pathParams.length - 1];
        return this.getList(new ListSingleQuery().getListRequest(listId))
    }

};