'use strict';
const AbstractResource = require('././AbstractResource');
const BounceResponse = require('../Response/BounceResponse');
const CollectionEntityResponse = require('../Model/CollectionEntityResponse');
const PagingMeta = require('../Model/PagingMeta');
const PagingLinks = require('../Model/PagingLinks');
module.exports = class BounceListResource extends AbstractResource{
    constructor(){
        super("/services/api/v1/bounce/subscriber");
    }
    addBounceSubscriber(request){
        this.curMethod = "POST";
        this.curEndpoint = this.endpoint + "/block";
        if(typeof request === 'string'){
            this.curBody = request;
        }
        else{
            this.curBody = request.getBody();
        }
        var response = this.dispatchToResponse();
        return response.statusCode === 201;
    }
    getBounceSubscribers(request){
        this.curMethod = "GET";
        this.curEndpoint = this.endpoint + request.toQueryParamRequest();
        this.curBody = "";
        var response = this.dispatchToResponse();
        return new CollectionEntityResponse(JSON.parse(response.getBody('utf8')), 'bounce')
    }
    getBounceSubscriber(request){
        this.curMethod = "GET";
        this.curEndpoint = this.endpoint + "/" + request.destination + request.getQueryParams();
        this.curBody = "";
        var response = this.dispatchToResponse();
        var responseString = response.getBody('utf8');
        return new BounceResponse(JSON.parse(responseString))
    }
    removeBounceSubscriber(destination){
        this.curMethod = "DELETE";
        this.curEndpoint = this.endpoint + "/unblock/" + destination;
        this.curBody = "";
        var response = this.dispatchToResponse();
        return this.isSuccessful(response);
    }
};