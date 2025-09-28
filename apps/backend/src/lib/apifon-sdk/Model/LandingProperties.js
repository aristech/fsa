'use strict';

module.exports = class LandingProperties{
    constructor(){
        this.url = null;
        this.data = null;
        this.redirect = null;
        this.method = null;
        this.prevent_sys_params = null;
    }

    addData(key, value){
        if(this.data == null){
            this.data = {};
        }
        this.data[key] = value;
    }
};