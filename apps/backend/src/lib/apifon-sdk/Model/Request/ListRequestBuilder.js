'use strict';

const ListType = require('../../Resource/Helpers/ListType');

class ListRequest{
    constructor(builder){
        this.id = builder.id;
        this.etag = builder.etag;
        this.gdpr_properties = builder.gdpr_properties;
        this.campaign_defaults = builder.campaign_defaults;
        this.type = builder.type;
        this.title = builder.title;
        this.prefix = builder.prefix;
        this.description = builder.description;
    }
    getBody(){
        return JSON.stringify(this, replacer);
    }
}
function replacer(key,value)
{
    if (value === null) return undefined;
    return value
}

module.exports = class ListRequestBuilder{
    id = null;
    etag = null;
    gdpr_properties = null;
    campaign_defaults = null;
    type = null;
    title = null;
    prefix = null;
    description = null;
    constructor(type=null, title=null, prefix=null, listId=null){
        this.type = type;
        this.title = title;
        this.prefix = prefix;
        this.id = listId;
    };

    getUpdateListRequestBuilder(list){
        if(typeof(list) == "string"){
            //check that the values exist
            return new ListRequestBuilder(null, null, null, list)
        }
        //check that the values exist
        return new ListRequestBuilder(list.type, list.title, list.prefix, list.id)
            .withCampaignDefaults(list.campaign_defaults)
            .withGdprProperties(list.gdpr_properties)
            .withDescription(list.description)
            .withEtag(list.meta.ETag);
    }


    getAddListRequestBuilder(type=ListType.ADVANCED, title, prefix) {
        //check that the values exist
        return new ListRequestBuilder(type, title, prefix);
    }
    withPrefix(prefix) {
        this.prefix = prefix;
        return this;
    }
    withTitle(title) {
        this.title = title;
        return this;
    }
    withGdprProperties(gdprProperties) {
        this.gdpr_properties = gdprProperties;
        return this;
    }
    withCampaignDefaults(campaignDefaults){
        this.campaign_defaults = campaignDefaults;
        return this;
    }
    withDescription(description){
        this.description = description;
        return this;
    }
    withEtag(etag){
        this.etag = etag;
        return this;
    }
    build() {
        return new ListRequest(this);
    }
};