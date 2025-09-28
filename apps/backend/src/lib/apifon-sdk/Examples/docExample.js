'use strict';

var Mookee = require('../Mookee');

const SMSResource = require('../Resource/SMSResource');
const SmsRequest = require('../Model/SmsRequest');
const MessageContent = require('../Model/MessageContent');

Mookee.getInstance();
Mookee.addCredentials("sms", "Your_SMS_Token", "Your_SMS_Secret_Key");
Mookee.setActiveCredential("sms");

var nums = ["306999999999"/*, "306999999998", "306999999997", ...*/];

var smsResource = new SMSResource();
var smsRequest = new SmsRequest();

var msgContent = new MessageContent();
msgContent.text = "Hello There!";
msgContent.sender_id = "Apifon";

smsRequest.addStrSubscribers(nums);
smsRequest.message = msgContent;

var response = smsResource.send(smsRequest);
printJson(response);

function printJson(response){
    console.log(JSON.stringify(response, replacer, 4));
}

function replacer(key,value)
{
    if (value === null) return undefined
    return value
}