'use strict';

module.exports = class OAuthResponse{
    status = null;
    title = null;
    error_description = null;
    error = null;
    constructor(error_description, error = null){
        this.status = 401;
        this.title = "Unauthorized";
        this.error_description = error_description;
        this.error = error;
    }
};