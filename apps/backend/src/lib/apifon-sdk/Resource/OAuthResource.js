'use strict';

const AbstractResource = require('./AbstractResource');
const OAuthCredentials = require('./Helpers/OAuthCredentials');
const OAuthGrantType = require('./Helpers/OAuthGrantType');
const OAuthResponse = require('./../Response/OAuthResponse');
const OAuthException = require('./../Exception/OAuthException');


module.exports = class OAuthResource extends AbstractResource {
    AUTHORIZE_URL = "oauth2/authorize";
    TOKEN_URL = "oauth2/token";
    REVOKE_URL = "oauth2/revoke";
    constructor(authorizationConfig, endpoint){
        super(endpoint);
        this.authorizationConfig = authorizationConfig;
        this.oauthCredentials = new OAuthCredentials();
    }

    getTokensForClientCredentialsGrant(){
        if (this.authorizationConfig.grantType !== OAuthGrantType.client_credentials) {
            //todo return OAuthTokenException not Error
            // throw new Error("Tried to retrieve tokens for client credentials but grant type is not client_credentials");
            throw new OAuthException(new OAuthResponse("Tried to retrieve tokens for client credentials but grant type is not client_credentials"))
        }
        var endpoint = this.endpoint + this.TOKEN_URL
            + "?grant_type=" + this.authorizationConfig.grantType
            + "&client_id=" + this.authorizationConfig.clientId
            + "&client_secret=" + this.authorizationConfig.clientSecret
            + "&scope=" + this.authorizationConfig.scope.join('+');
        var headers = {};
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        var request = require('sync-request');
        var resp = request('POST', endpoint, {
            headers: headers,
            body: ""
        });
        // var rere = JSON.parse(resp.getBody('utf8'));
        if(resp.statusCode === 200){
            Object.assign(this.oauthCredentials, JSON.parse(resp.getBody('utf8')))
        }else{
            //todo return OAuthTokenException not Error
            // throw new Error('error at getTokensForClientCredentialsGrant');
            var respObj = JSON.parse(resp.body.toString());
            throw new OAuthException(new OAuthResponse(respObj.error_description, respObj.error))
        }
    }


    revokeTokens(){
        this.revokeAccessToken()
    }
    revokeAccessToken() {
        if (this.oauthCredentials.access_token != null) {
            this.revokeToken(this.oauthCredentials.access_token, "access_token");
            this.oauthCredentials.access_token=null;
            return true;
        }
        return false;
    }
    refreshToken(){
        if (this.authorizationConfig.grantType == null) {
            return;
        }
        switch (this.authorizationConfig.grantType) {
            case "client_credentials":
                this.getTokensForClientCredentialsGrant();
                break;
        }
    }
    revokeToken(token, tokenTypeHint){
        var endpoint = this.endpoint + this.REVOKE_URL + "?client_id=" + this.authorizationConfig.clientId
            + "&token=" + token + "&token_type_hint=" + tokenTypeHint;
        if(OAuthGrantType.client_credentials === this.authorizationConfig.grantType){
            endpoint += "&client_secret=" + this.authorizationConfig.clientSecret;
        }
        var headers = {};
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        var request = require('sync-request');
        var resp = request('POST', endpoint, {
            headers: headers,
            body: ""
        });
        if (resp.statusCode !== 200) {
            //todo OAuthTokenException not Error
            throw new Error("Failed to revoke token")
        }
    }
};