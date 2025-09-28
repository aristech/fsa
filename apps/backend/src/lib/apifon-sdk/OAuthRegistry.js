'use strict';

const OAuthResource = require('./Resource/OAuthResource');
const OAuthResponse = require('./Response/OAuthResponse');
const OAuthException = require('./Exception/OAuthException');
global.instance = null;

module.exports = class OAuthRegistry{
    constructor(){
        this.oauthRegistry = new Map();
    }

    addOAuthResource(identifier, oauthConfiguration, endpoint){
        var oAuthResource = new OAuthResource(oauthConfiguration, endpoint);
        if (this.oauthRegistry.has(identifier)) {
            this.removeOAuthResource(identifier, true);
        }
        this.oauthRegistry.set(identifier, oAuthResource);
    }
    removeOAuthResource(identifier, revokeTokens){
        if (this.oauthRegistry.has(identifier)) {
            if (revokeTokens) {
                this.revokeTokens(identifier);
            }
            this.oauthRegistry.delete(identifier);
        }
    }
    isOAuthEnabled(identifier){
        return this.oauthRegistry.has(identifier);
    }
    revokeTokens(identifier){
        this.validateOAuthEnabled(identifier); //if not throw OAuthException
        this.oauthRegistry.get(identifier).revokeTokens();
    }
    getResourceForIdentifier(identifier){
        this.validateOAuthEnabled(identifier);
        return this.oauthRegistry.get(identifier);
    }
    retrieveTokensForClientCredential(identifier){
        this.validateOAuthEnabled(identifier);
        var resource = this.oauthRegistry.get(identifier);
        resource.getTokensForClientCredentialsGrant();
    }
    refreshTokens(identifier){
        this.validateOAuthEnabled(identifier);
        this.oauthRegistry.get(identifier).refreshToken();
    }
    retrieveActiveTokens(identifier){
        if (this.oauthRegistry.has(identifier)) {
            return this.getResourceForIdentifier(identifier).oauthCredentials
        }else{
            //todo OAuthException not Error
            // throw new Error("Active tokens for " + identifier + " not located.")
            throw new OAuthException(new OAuthResponse("Active tokens for " + identifier + " not located."))
        }
    }
    validateOAuthEnabled(identifier){
        if (!this.isOAuthEnabled(identifier)){
            //todo: OAuthException not Error
            // throw new Error("Identifier " + identifier + " doesn't have OAuth enabled.")
            throw new OAuthException(new OAuthResponse("Identifier " + identifier + " doesn't have OAuth enabled."))
        }
    }

};