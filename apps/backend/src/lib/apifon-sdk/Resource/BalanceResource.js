'use strict';

const AbstractResource = require('././AbstractResource');
var BalanceResponse = require('./../Response/BalanceResponse');

module.exports = class BalanceResource extends AbstractResource {

        constructor(){
            super("/services/balance");
        }

        send()
        {
            this.curEndpoint = this.endpoint;
            this.curBody = "";
            this.curMethod = "POST";

            return new BalanceResponse(this.dispatch());
        }
    };
