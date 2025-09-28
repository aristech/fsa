'use strict';

var Mookee = require('../Mookee');

module.exports = class AbstractResource {

        constructor(endpoint){
            this.endpoint = endpoint;
            this.curEndpoint = null;
            this.curBody = null;
            this.curMethod = null;
            this.curHeaders = {};
        }

        addEtagHeader(etag){
            if(etag == null){
                return;
            }
            this.curHeaders["If-Match"] = etag;
        }

        isSuccessful(resp){
            if (resp.statusCode === 304){
                console.log("Status: 304 \n" + "Title: Not modified. The request was completed but the resource was not modified.");
                // return false;
            }
            return true;
        }

        dispatch(){
            return Mookee.dispatch(this);
        }
        dispatchToResponse(){
            return Mookee.dispatchToResponse(this);
        }

        create(request){
            this.curEndpoint = this.endpoint + "/create";
            this.curBody = request.getCreateBody();
            this.curMethod = "POST";
            return Mookee.dispatch(this);
        }

        read(request){
            this.curEndpoint = this.endpoint + "/read";
            this.curBody = request.getReadBody();
            this.curMethod = "GET";
            return Mookee.dispatch(this);
        }

        update(request){
            this.curEndpoint = this.endpoint + "/update";
            this.curBody = request.getUpdateBody();
            this.curMethod = "POST";
            return Mookee.dispatch(this);
        }

        delete(request){
            this.curEndpoint = this.endpoint + "/delete";
            this.curBody = request.getDeleteBody();
            this.curMethod = "DELETE";
            return Mookee.dispatch(this);
        }
};