'use strict';

class CampaignDefaults{


    constructor(builder){
        this.sender_id = builder.sender_id;
        this.viber_sender_id = builder.viber_sender_id;
        this.sender_name = builder.sender_name;
        this.from = builder.from;
        this.reply_to = builder.reply_to;
    }
}

class CampaignDefaultsBuilder{
    sender_id = null;
    viber_sender_id = null;
    sender_name = null;
    from = null;
    reply_to = null;
    constructor(defaults) {
        if (defaults !== undefined) {
            if (defaults == null){
                return
            }
            this.from = defaults.from;
            this.reply_to = defaults.reply_to;
            this.sender_id = defaults.sender_id;
            this.sender_name = defaults.sender_name;
            this.viber_sender_id = defaults.viber_sender_id;
        }
    }
    /*
    When you want to build the Campaign defaults from scratch
     */
    getCampaignDefaultsBuilder() {
        return new CampaignDefaultsBuilder()
    }
    /*
    When you already have the defaults (from a request response maybe) and you want to get the builder to change a thing
    inside the defaults and build it again.
     */
    getBuilderFromCampaignDefaults(defaults){
        return new CampaignDefaultsBuilder(defaults)
    }
    setSenderId(senderId) {
        this.sender_id = senderId;
        return this;
    }
    setViberSenderId(viberSenderId) {
        this.viber_sender_id = viberSenderId;
        return this;
    }
    setSenderName(senderName) {
        this.sender_name = senderName;
        return this;
    }
    setFrom(from) {
        this.from = from;
        return this;
    }
    setReplyTo(replyTo) {
        this.reply_to = replyTo;
        return this;
    }
    build() {
        return new CampaignDefaults(this);
    }
}
module.exports = {
    CampaignDefaults,
    CampaignDefaultsBuilder
};