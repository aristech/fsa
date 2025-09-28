'use strict';

const OpenIDScope = require('../../Resource/Helpers/OpenIDScope');
const OAuthGrantType = require('../../Resource/Helpers/OAuthGrantType');

class OAuthConfiguration{
    grantType = null;
    clientId = null;
    scope = null;
    clientSecret = null;
    pkceChallenge = null;
    redirectUri = null;
    state = null;
    constructor(builder){
        this.grantType = builder.grantType;
        this.clientId = builder.clientId;
        this.scope = builder.scope;
        this.clientSecret = builder.clientSecret;
        if (builder.pkceChallenge != null) {
            this.pkceChallenge = builder.pkceChallenge
            // this.pkceChallenge = new S256PKCEChallenge(builder.pkceChallenge.getCodeVerifier());
        } else {
            this.pkceChallenge = null;
        }
        this.redirectUri = builder.redirectUri;
        this.state = builder.state;
    }
}

module.exports = class OAuthConfigurationBuilder{
    grantType = null;
    clientId = null;
    scope = [];
    clientSecret = null;
    pkceChallenge = null;
    redirectUri = null;
    state = null;
    constructor(clientId, grantType){
        this. grantType = grantType;
        this.clientId = clientId;
    }
    getClientCredentialsBuilder(clientId, clientSecret){
        return new OAuthConfigurationBuilder(clientId, OAuthGrantType.client_credentials)
            .withClientSecret(clientSecret);
    }
    withClientSecret(clientSecret){
        this.clientSecret = clientSecret;
        return this;
    }
    withScope(scope){
        this.scope.push(scope);
        return this;
    }
    withScopes(scopes){
        scopes.forEach(scope=>this.scope.push(scope));
        return this;
    }
    withRedirectUri(redirectUri, forceUrlEncoding){
        if(typeof forceUrlEncoding !== 'undefined'){
            this.redirectUri = redirectUri.toString();
        }else{
            this.redirectUri = redirectUri;
        }
        return this;
    }
    withState(state){
        this.state = state;
        return this;
    }
    build(){
        return new OAuthConfiguration(this);
    }
};