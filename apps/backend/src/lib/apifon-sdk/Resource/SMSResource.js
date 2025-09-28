'use strict';

const AbstractResource = require('././AbstractResource');
var GatewayResponse = require('./../Response/GatewayResponse');

module.exports = class SMSResource extends AbstractResource {

        constructor(){
            super("/services/sms");
        }

        send(request)
        {
            this.curEndpoint = this.endpoint + "/send";
            if(typeof request === 'string'){
                this.curBody = request;
            }
            else{
                this.curBody = request.getBody();
            }
            this.curMethod = "POST";

            return new GatewayResponse(this.dispatch());
        }

        remove(request){
            this.curEndpoint = this.endpoint + "/remove";
            if(typeof request === 'string'){
                this.curBody = request;
            }
            else{
                this.curBody = request.getBody();
            }
            this.curMethod = "POST";

            return this.dispatch();
        }


};

