"use strict";

var Hmac = require('./Security/Hmac');
var GatewayResponse = require('./Response/GatewayResponse');
const ApifonRestException = require('./Exception/ApifonRestException');
const ApiErrorResponse = require('./Response/ApiErrorResponse');
const OAuthResponse = require('./Response/OAuthResponse');
const OAuthException = require('./Exception/OAuthException');
global.instance = null;

module.exports = class Mookee{

    constructor () {
        this.staging = false;
        this.instance = null;
        this.base_url = null;
        this.production_url = "https://ars.apifon.com";
        this.staging_url = "http://ars-staging.apifon.com";
        this.identity_production_server_url = "https://ids.apifon.com/";
        this.identity_staging_server_url = "https://ids-staging.apifon.com/";
        this.credentials = new Map();
        this.key = '';
        this.activeOAuthIdentifier = null;
        this.autoRefreshTokens = null;
        this.signer = null;
        this.oAuthRegistry = new OAuthRegistry();
    }

    static getInstance()
    {
        // Check if instance is already exists
        if(global.instance === null) {
            global.instance = new Mookee();
        }
        return global.instance;
    }

    static setMookeeToOAuthMode(identifier, autoRefreshTokens){
        if (this.isOAuthEnabled(identifier)) {
            global.instance.activeOAuthIdentifier = identifier;
            global.instance.autoRefreshTokens = autoRefreshTokens;
            return;
        }
        throw new OAuthException(new OAuthResponse("Identifier " + identifier + " is not a valid OAuth identifier."))
    }

    static setMookeeToHMACTokenMode(){global.instance.activeOAuthIdentifier = null;}

    static setStaging(enable = false, host=null, identityServerHost=null){
        global.instance.staging = enable;
        if(host !== null){
            global.instance.staging_url=host;
        }
        if(identityServerHost !== null){
            global.instance.identity_staging_server_url = identityServerHost;
        }
    }

    static addOAuthResource(identifier, oauthConfiguration){
        global.instance.oAuthRegistry.addOAuthResource(identifier,oauthConfiguration, this.getInstance().getIdentityServerUrl())
    }
    static removeOAuthResource(identifier,revokeTokens){
        global.instance.oAuthRegistry.removeOAuthResource(identifier, revokeTokens)
    }
    static revokeTokens(identifier){
        global.instance.oAuthRegistry.revokeTokens(identifier)
    }

    static isOAuthEnabled(identifier){
        return global.instance.oAuthRegistry.isOAuthEnabled(identifier);
    }
    static retrieveClientCredentialsToken(identifier){
        global.instance.oAuthRegistry.retrieveTokensForClientCredential(identifier)
    }



    //private set date with timezone
    getRequestDate(){
        var d = new Date();
        return d.toUTCString();
    }

    //Set credentials
    static addCredentials(key, token, privateKey) {
        var list = [];
        list.push(token);
        list.push(privateKey);
        global.instance.credentials.set(key, list);
    }

    static setActiveCredential(k){
        global.instance.key = k;
    }

    static dispatch(resource){

        if(global.instance.staging){
            global.instance.base_url = global.instance.staging_url;
        }
        else{
            global.instance.base_url = global.instance.production_url;
        }

        var endpoint = resource.curEndpoint;
        var body = resource.curBody;
        var method = resource.curMethod;

        try{
            return global.instance.makeCall(endpoint, method, body, resource.curHeaders);
        }catch (Exception) {
            if (Exception instanceof ApifonRestException)
                throw Exception;
            console.log(Exception);
            return "";
        }
    }

    static dispatchToResponse(resource){

        if(global.instance.staging){
            global.instance.base_url = global.instance.staging_url;
        }
        else{
            global.instance.base_url = global.instance.production_url;
        }

        var endpoint = resource.curEndpoint;
        var body = resource.curBody;
        var method = resource.curMethod;

        try{
            var response;
            if (global.instance.activeOAuthIdentifier != null) {
                response = global.instance.makeOauthCallToResponse(endpoint, method, body, resource.curHeaders);
            } else {
                response = global.instance.makeCallToResponse(endpoint, method, body, resource.curHeaders);
            }
            return global.instance.validateResponse(response);
        }catch (Exception) {
            if (Exception instanceof ApifonRestException)
                throw Exception;
            console.log(Exception);
            return "";
            // var textEncoding = require('text-encoding');
            // var TextDecoder = textEncoding.TextDecoder;
            // var enc = new TextDecoder();
            // var arr = new Uint8Array(Exception.body);
            // return JSON.parse(enc.decode(arr));
        }
    }

    makeCall(endpoint, method, body, headers) {
        var response;
        if (global.instance.activeOAuthIdentifier != null) {
            response = global.instance.makeOauthCallToResponse(endpoint, method, body, headers);
        } else {
            response = global.instance.makeCallToResponse(endpoint, method, body, headers);
        }
        if (response.statusCode === 401){
            var ErrorResponse = new ApiErrorResponse;
            ErrorResponse.status = 401;
            ErrorResponse.title = "Unauthorized";
            throw new ApifonRestException(ErrorResponse);
        }
        return JSON.parse(response.body.toString('utf8'));

    }

    makeCallToResponse(endpoint, method, body, headers) {
        var url = global.instance.base_url + endpoint;
        //Get the date from internal function
        var requestDate = global.instance.getRequestDate();
        var tmURI = new URL(url);

        //Build the message
        var message = method + "\n"
            + tmURI.pathname + "\n"
            + body + "\n"
            + requestDate;

        //Get the signature from the hmac class
        var signature = Hmac.sign(message, global.instance.credentials.get(global.instance.key)[1]);
        //Make the request call
        var request = require('sync-request');
        headers['Content-type'] = 'application/json';
        headers['Authorization'] = 'ApifonWS ' + global.instance.credentials.get(global.instance.key)[0] + ":" + signature;
        headers['X-ApifonWS-Date'] = requestDate;
        var response =  request(method, url, {
            headers: headers,
            body: body
        });
        // return this.validateResponse(response);
        return response;
    }
    makeOauthCallToResponse(endpoint, method, body, headers){
        var url = global.instance.base_url + endpoint;
        headers['Content-type'] = 'application/json';
        headers['Authorization'] = 'Bearer ' + this.getActiveOAuthCredential();
        var request = require('sync-request');
        var response =  request(method, url, {
            headers: headers,
            body: body
        });
        // Special case for oauth calls with auto refresh tokens
        if (response.statusCode === 401){
            if (global.instance.autoRefreshTokens) {
                // try {
                global.instance.oAuthRegistry.refreshTokens(global.instance.activeOAuthIdentifier);
                headers['Authorization'] = 'Bearer ' + this.getActiveOAuthCredential();
                var resp =  request(method, url, {
                    headers: headers,
                    body: body
                });
                return resp;
            }
        }
        return response;
    }

    validateResponse(response){
        if (response.statusCode === 401) {
            var ErrorResponse = new ApiErrorResponse;
            ErrorResponse.status = 401;
            ErrorResponse.title = "Unauthorized";
            throw new ApifonRestException(ErrorResponse);
        }
        if (response.statusCode >= 400){
            var respBody = JSON.parse(response.body.toString('utf8'));
            throw new ApifonRestException(Object.assign(new ApiErrorResponse, respBody));
        }
        return response;
    }

    getActiveOAuthCredential(){
        var oauthCredentials = global.instance.oAuthRegistry.retrieveActiveTokens(global.instance.activeOAuthIdentifier);
        if(oauthCredentials.hasExpired() && global.instance.autoRefreshTokens){
            global.instance.oAuthRegistry.refreshTokens(global.instance.activeOAuthIdentifier);
            return global.instance.oAuthRegistry.retrieveActiveTokens(global.instance.activeOAuthIdentifier).access_token;
        }
        return oauthCredentials.access_token;
    }
    getIdentityServerUrl() {
        if (global.instance.staging != null && global.instance.staging) {
            return global.instance.identity_staging_server_url;
        }
        return global.instance.identity_production_server_url;
    }
};
const OAuthRegistry = require('./OAuthRegistry');