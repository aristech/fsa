'use strict';
const AbstractSingleQuery = require('./AbstractSingleQuery');
module.exports = class BounceSingleQuery extends AbstractSingleQuery{
    destination = null;
    fields = [];
    constructor(destination){
        super()
        this.destination = destination;
        this.fields = [];
    }
    getBounceLookup(destination){
        return new BounceSingleQuery(destination);
    }
};