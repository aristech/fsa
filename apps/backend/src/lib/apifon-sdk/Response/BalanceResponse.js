'use strict';

module.exports =class BalanceResponse{

    constructor(arrayValues){
        this.balance = null;
        this.plafon = null;
        this.assignBalanceResponse(arrayValues);
    }

    assignBalanceResponse(arrayValues){
        if (typeof arrayValues.balance !== 'undefined') {
            this.balance = arrayValues.balance;
        }
        if (typeof arrayValues.plafon !== 'undefined') {
            this.plafon = arrayValues.plafon;
        }
    };
};