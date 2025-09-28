'use strict';

const OAuthConfigurationBuilder = require('../Model/Request/OAuthConfigurationBuilder');
const ApifonRestException = require('../Exception/ApifonRestException');
var Mookee = require('../Mookee');
const ListResource = require('../Resource/ListResource');
const ListRequestBuilder = require('../Model/Request/ListRequestBuilder');
const {CampaignDefaults,CampaignDefaultsBuilder} = require('../Model/Request/CampaignDefaultsBuilder');
const {GdprProperties,GdprPropertiesBuilder} = require('../Model/Request/GdprPropertiesBuilder');
/*
Helpers
 */
const ListType = require('../Resource/Helpers/ListType');

var OAUTH_IDENTIFIER = "someId";
var CLIENT_ID = "MY_OAUTH_CLIENT_ID";
var CLIENT_SECRET = "MY_OAUTH_SECRET_KEY";

var listResource = new ListResource();
var oauthConfig = new OAuthConfigurationBuilder()
    .getClientCredentialsBuilder(CLIENT_ID, CLIENT_SECRET)
    .build();
Mookee.getInstance();

try {

    // I can make multiple OAUTH identifiers with multiple oauth configurations and retrieve their tokens
    Mookee.addOAuthResource(OAUTH_IDENTIFIER, oauthConfig);

    Mookee.retrieveClientCredentialsToken(OAUTH_IDENTIFIER);
    // During the program execution, i can switch to another identifier
    Mookee.setMookeeToOAuthMode(OAUTH_IDENTIFIER, true);


    createList();

    // Mookee.revokeTokens(OAUTH_IDENTIFIER);
    Mookee.removeOAuthResource(OAUTH_IDENTIFIER,false);

}catch (e) {
    if (e instanceof ApifonRestException)
        console.log(e.toString());
    else
        console.log(e)
}


function createList(){
    console.log("------ Create List ------");
    var request = new ListRequestBuilder().getAddListRequestBuilder(ListType.ADVANCED, "OAuth2 List 2", "30")
        .withDescription("This is a list created using the SDK.")
        .withCampaignDefaults(
            new CampaignDefaultsBuilder().getCampaignDefaultsBuilder()
                .setFrom("email@apifon.com")
                .setReplyTo("noreply@apifon.com")
                .setSenderName("Apifon")
                .setSenderId("Apifon")
                .build()
        )
        .withGdprProperties(
            new GdprPropertiesBuilder().getGdprPropertiesBuilder(true)
                .setDescription("Information about the purposes we wish to contact you.")
                .setTitle("Communication Purposes")
                .setLegalText("My Legal Text")
                .build()
        )
        .build();
    var createdListURI = listResource.createList(request);
    var resp = listResource.getByResourceUri(createdListURI);
    console.log("------ List Response Body ------");
    console.log(resp);
}
