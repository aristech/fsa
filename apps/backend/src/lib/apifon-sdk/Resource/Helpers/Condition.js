'use strict';

module.exports = class Condition{
    name = null;
    op = null;
    vl = null;
    constructor(name, op, vl){
        this.name = name;
        this.op = op;
        this.vl = vl;
    }
};