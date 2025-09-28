const SubscriberResponse = require('../Response/SubscriberResponse');
const PagingMeta = require('../Model/PagingMeta');
const PagingLinks = require('../Model/PagingLinks');
const CollectionEntityResponse = require('../Model/CollectionEntityResponse');
const AbstractResource = require('././AbstractResource');

module.exports = class SubscriberResource extends AbstractResource {
    constructor(){
        super("/services/api/v1/list/{list_id}/subscriber");
    }
    replacePlaceholderAndSetUrl(suffix, listId){
        this.curEndpoint = (this.endpoint + suffix).replace("{list_id}", listId)
    }
    addSubscriber(request){
        this.curMethod = "POST";
        this.replacePlaceholderAndSetUrl("/", request.listId);
        if(typeof request === 'string'){
            this.curBody = request;
        }
        else{
            this.curBody = request.getBody();
        }
        var response = this.dispatchToResponse();
        return new URL(response.headers.location);
    }
    getSubscriber(request){
        this.curMethod = "GET";
        this.replacePlaceholderAndSetUrl("/" + request.lookupMD5 + request.getQueryParams(), request.listId);
        this.curBody = "";
        var response = this.dispatchToResponse();
        var responseString = response.getBody('utf8');
        return new SubscriberResponse(JSON.parse(responseString))
    }
    updateSubscriber(request){
        this.curMethod = "PUT";
        this.replacePlaceholderAndSetUrl("/" + request.lookupMD5, request.listId);
        if(typeof request === 'string'){
            this.curBody = request;
        }
        else{
            this.curBody = request.getBody();
        }
        var response = this.dispatchToResponse();
        return new URL(response.headers["content-location"]);
    }
    removeSubscriber(listId, lookupMD5){
        this.curMethod = "DELETE";
        this.replacePlaceholderAndSetUrl("/" + lookupMD5, listId);
        this.curBody = "";
        var response = this.dispatchToResponse();
        return this.isSuccessful(response);
    }
    querySubscribers(request){
        this.curMethod = "GET";
        if (typeof(request) === "string"){
            var tmpUrl = new URL(request);
            this.curEndpoint = tmpUrl.pathname + tmpUrl.search;}
        else
            this.replacePlaceholderAndSetUrl(request.toQueryParamRequest(), request.listId);
            // this.curEndpoint = this.endpoint + request.toQueryParamRequest();
        this.curBody = "";
        var response = this.dispatchToResponse();
        return new CollectionEntityResponse(JSON.parse(response.getBody('utf8')), 'subscribers')
    }
    querySubscribersWithConditions(request){
        this.curMethod = "POST";
        this.replacePlaceholderAndSetUrl("/query", request.listId);
        if(typeof request === 'string'){
            this.curBody = request;
        }
        else{
            this.curBody = request.getBody();
        }
        var response = this.dispatchToResponse();
        return new CollectionEntityResponse(JSON.parse(response.getBody('utf8')), 'subscribers')
    }
    subscribeSubscriber(listId, lookupMD5){
        this.curMethod = "POST";
        this.replacePlaceholderAndSetUrl("/" + lookupMD5 + "/subscribe", listId);
        this.curBody = "";
        var response = this.dispatchToResponse();
        return this.isSuccessful(response);
    }
    unsubscribeSubscriber(listId, lookupMD5){
        this.curMethod = "POST";
        this.replacePlaceholderAndSetUrl("/" + lookupMD5 + "/unsubscribe", listId);
        this.curBody = "";
        var response = this.dispatchToResponse();
        return this.isSuccessful(response);
    }
    getByResourceUri(resourceUri){
        this.curMethod = "GET";
        this.curEndpoint = resourceUri.pathname;
        this.curBody = "";
        var resp = this.dispatchToResponse();
        var responseString = resp.getBody('utf8');
        return new SubscriberResponse(JSON.parse(responseString))
    }
};