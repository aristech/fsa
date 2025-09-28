'use strict';

module.exports = class SubscriberInformation {

    constructor(){
        this.number = '';
        this.custom_id = null;
        this.params = null;
    }

    addParam(key, value){
        if(this.params == null){
            this.params = {};
        }
        this.params[key] = value;
    }

    setLandingPage(lp){
        if(this.params == null){
            this.params = {};
        }
        this.params["apifon_lp"] = lp;
    }

};

