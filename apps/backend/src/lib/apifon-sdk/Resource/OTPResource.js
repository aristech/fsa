'use strict';

const AbstractResource = require('././AbstractResource');
var OtpVerifyResponse = require('./../Response/OtpVerifyResponse');
var OtpResponse = require('./../Response/OtpResponse');

module.exports = class OTPResource extends AbstractResource {

        constructor(){
            super("/services/otp");
        }

        create(request)
        {
            this.curEndpoint = this.endpoint + "/create";
            if(typeof request === 'string'){
                this.curBody = request;
            }
            else{
                this.curBody = request.getCreateBody();
            }
            this.curMethod = "POST";

            return new OtpResponse(this.dispatch());
        }

        verify(reference, code)
        {
            this.curEndpoint = this.endpoint + "/verify/" + reference + "/" + code;
            this.curBody = "";
            this.curMethod = "POST";

            return new OtpVerifyResponse(this.dispatch());
        }
    };
