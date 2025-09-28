'use strict';

module.exports = class OAuthCredentials{
    constructor(){
        this.access_token = '';
        this.refresh_token = '';
        this.access_code = '';
        this.expires_in = '';
        this.expirationDate = '';
    }
    hasExpired(){
        if (this.expirationDate != null) {
            return new Date().valueOf() < this.expirationDate;
        }
        return true;
    }
};