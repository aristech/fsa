'use strict';

/**
 * This is a complete example on how to use the APIFON SDK for NodeJS.
 */
var Mookee = require('../Mookee');
const BalanceResource = require('../Resource/BalanceResource');
const SMSResource = require('../Resource/SMSResource');
const IMResource = require('../Resource/IMResource');
const OTPResource = require('../Resource/OTPResource');
const ImRequest = require('../Model/ImRequest');
const SmsRequest = require('../Model/SmsRequest');
const OtpRequest = require('../Model/OtpRequest');
const MessageContent = require('../Model/MessageContent');
const SubscriberInformation = require('../Model/SubscriberInformation');
const IMAction = require('../Model/IMAction');
const IMChannel = require('../Model/IMChannel');
const RemoveRequest = require('../Model/RemoveRequest');
const LandingProperties = require('../Model/LandingProperties');
var subscribers = [];
var readlineSync = require('readline-sync');
const ApifonRestException = require('../Exception/ApifonRestException');
/**
 * First things first, we need to set our credentials that we got from
 * the Mookee platform.
 */
Mookee.getInstance();
Mookee.addCredentials("sms", "Your_SMS_Token", "Your_SMS_Secret_Key");
Mookee.addCredentials("viber", "Your_Viber_Token", "Your_Viber_Secret_Key");
Mookee.addCredentials("otp", "Your_OTP_Token", "Your_OTP_Secret_Key");

var choice =  "1";

/**
 * These are our Resources.
 */
var smsResource = new SMSResource();
var imResource = new IMResource();
var otpResource = new OTPResource();

/**
 * These are our Requests.
 */
var smsRequest;
var imRequest;
var otpRequest;
var removeRequest;

/**
 * Here we generate the date that scheduled messages will be sent.
 */
var dateFormat = require('dateformat');
var now = new Date();
var dateTime = dateFormat(now, "yyyy-mm-dd'T'HH:MM:ss");
dateTime = dateTime.replace('2', '3');

/**
 * Here we create our subscribers.
 */
var names = ["John", "George", "Alex", "Helen"];
var names2 = ["Kate", "Julie", "Paul", "Mary"];
var nums = ["306999999999"/*, "306999999998", "306999999997", ...*/];

/**
 * Here we define the content of our Request.
 */
var subscribers = [];
var imChannel;
var imAction;
var msgContent;
var response;
var otpResp;
var otpVerResp;
var delResp;
var callbackUrl = "https://yourserver/callback";
var replyUrl = "https://yourserver/replyurl";
var deletionType;

try {


    while(choice !== "0"){
        console.log("------ Menu ------");
        console.log("0.  Exit");
        console.log("1.  Send Simple SMS");
        console.log("2.  Send Complete SMS");
        console.log("3.  Send Scheduled SMS");
        console.log("4.  Remove Scheduled SMS");
        console.log("5.  Send SMS With Landing Page");
        console.log("6.  Case 1: Send IM With Text");
        console.log("7.  Case 2: Send IM With Image");
        console.log("8.  Case 3: Send IM With Text and Button");
        console.log("9.  Case 4: Send IM With Text, Image and Button");
        console.log("10. Send Complete IM without fallback");
        console.log("11. Send Scheduled IM");
        console.log("12. Remove Scheduled IM");
        console.log("13. Send IM With Landing Page");
        console.log("14. Send IM With Fallback SMS");
        console.log("15. Send IM With Fallback Landing Page SMS");
        console.log("16. Send 2-Way IM");
        console.log("17. Send Balance Request");
        console.log("18. Send Simple OTP Create Request");
        console.log("19. Send Complete OTP Create Request");
        console.log("20. Send OTP Verification Request");
        choice = readlineSync.question('Choice: ');

        /**
         * Every request has the same structure:
         *  *First we set the Credential we want to use.
         *  *Then we build the components of the Request.
         *  *Finally we build the Request and send it.
         *  *We print the response we get in console.
         */
        switch(choice){
            //Exit Loop
            case "0":
                break;

            /**
             * This is a simple SMS Request.
             */
            case "1":
                Mookee.setActiveCredential("sms");

                smsRequest = new SmsRequest();

                msgContent = new MessageContent();
                msgContent.text = "Hello There!";
                msgContent.sender_id = "Apifon";

                smsRequest.addStrSubscribers(nums);
                smsRequest.message = msgContent;
                smsRequest.callback_url = callbackUrl;

                console.log("Sending Request to Endpoint: /services/sms/send");
                console.log("------ SMS Request Body ------");
                printJson(smsRequest);
                response = smsResource.send(smsRequest);
                console.log("------ Gateway Response Body ------");
                printJson(response);
                break;

            /**
             * In this SMS example we are taking advantage of every property that
             * can be changed in a Request.
             */
            case "2":
                Mookee.setActiveCredential("sms");

                smsRequest = new SmsRequest();

                msgContent = new MessageContent();
                msgContent.text = "Hello {name}!  Would you like to renew your subscription?";
                msgContent.dc = 0;
                msgContent.sender_id = "Apifon";

                subscribers = [];
                for(var i = 0; i < nums.length; i++){
                    var sub = new SubscriberInformation();
                    sub.number = nums[i];
                    sub.custom_id = "222";
                    sub.addParam("name", names[i])
                    subscribers.push(sub);
                }

                smsRequest.addSubscribers(subscribers);
                smsRequest.reference_id = "reference";
                smsRequest.message = msgContent;
                smsRequest.callback_url = callbackUrl;
                smsRequest.tte = "86400";

                console.log("Sending Request to Endpoint: /services/sms/send");
                console.log("------ SMS Request Body ------");
                printJson(smsRequest);
                response = smsResource.send(smsRequest);
                console.log("------ Gateway Response Body ------");
                printJson(response);
                break;

            /**
             * Here we send a scheduled SMS Request.
             */
            case "3":
                Mookee.setActiveCredential("sms");

                smsRequest = new SmsRequest();

                msgContent = new MessageContent();
                msgContent.text = "Hello There!";
                msgContent.sender_id = "Apifon";

                smsRequest.addStrSubscribers(nums);
                smsRequest.message = msgContent;
                smsRequest.callback_url = callbackUrl;
                smsRequest.date = dateTime;

                console.log("Sending Request to Endpoint: /services/sms/send");
                console.log("------ SMS Request Body ------");
                printJson(smsRequest);
                response = smsResource.send(smsRequest);
                console.log("------ Gateway Response Body ------");
                printJson(response);
                break;

            /**
             * This is an SMS Deletion case.
             */
            case "4":
                Mookee.setActiveCredential("sms");

                deletionType = "";
                while(deletionType !== "0" && deletionType !== "1" && deletionType !== "2"){
                    deletionType = readlineSync.question('Do you want to delete scheduled messages using Request ID or Reference ID?\nEnter [0] for Request ID, [1] for Reference ID or [2] to exit: ');
                    if(deletionType !== "0" && deletionType !== "1" && deletionType !== "2"){
                        console.log("Invalid Option.");
                    }
                }
                if(deletionType !== "2"){
                    removeRequest = new RemoveRequest();
                    if(deletionType === "0"){
                        removeRequest.field = 'REQUEST_ID';
                        removeRequest.id = readlineSync.question('Please enter the Request ID of the scheduled message you want to delete: ');
                    }
                    else{
                        removeRequest.field = 'REFERENCE_ID';
                        removeRequest.id = readlineSync.question('Please enter the Reference ID of the scheduled message you want to delete: ');
                    }
                    console.log("Sending Request to Endpoint: /services/sms/remove");
                    console.log("------ SMS Remove Request Body ------");
                    printJson(removeRequest);
                    delResp = smsResource.remove(removeRequest);
                    console.log("------ SMS Remove Request Response ------\n" + delResp);
                }
                break;

            /**
             * In this example we are sending an SMS Request with a landing page.
             * {apifon_lp} will later be replaced with the URL property of the
             * landing page.
             */
            case "5":
                Mookee.setActiveCredential("sms");

                smsRequest = new SmsRequest();

                msgContent = new MessageContent();
                msgContent.text = "Hello {name}! {apifon_lp}";
                msgContent.dc = 0;
                msgContent.sender_id = "Apifon";

                subscribers = [];
                for(var i = 0; i < nums.length; i++){
                    var sub = new SubscriberInformation();
                    sub.number = nums[i];
                    sub.custom_id = "222";
                    sub.addParam("name", names[i])

                    var lp = new LandingProperties();
                    lp.url = "https://mookee.apifon.com/user/login/";
                    lp.addData("name", names2[subscribers.length]);
                    lp.redirect = true;

                    sub.setLandingPage(lp);
                    subscribers.push(sub);
                }

                smsRequest.addSubscribers(subscribers);
                smsRequest.reference_id = "reference";
                smsRequest.message = msgContent;
                smsRequest.callback_url = callbackUrl;
                smsRequest.tte = "86400";

                console.log("Sending Request to Endpoint: /services/sms/send");
                console.log("------ SMS Request Body ------");
                printJson(smsRequest);
                response = smsResource.send(smsRequest);
                console.log("------ Gateway Response Body ------");
                printJson(response);
                break;

            /**
             * Viber Case 1: Send IM that contains only a text.
             */
            case "6":
                Mookee.setActiveCredential("viber");

                imRequest = new ImRequest();
                imChannel = new IMChannel();

                imChannel.text = "50% discount on our membership fee if you renew your subscription today!";
                imChannel.sender_id = "Mookee";

                imRequest.addStrSubscribers(nums);
                imRequest.callback_url = callbackUrl;
                imRequest.addChannel(imChannel);

                console.log("Sending Request to Endpoint: /services/im/send");
                console.log("------ IM Request Body ------");
                printJson(imRequest);
                response = imResource.send(imRequest);
                console.log("------ Gateway Response Body ------");
                printJson(response);
                break;

            /**
             * Viber Case 2: Send IM that contains only an image.
             */
            case "7":
                Mookee.setActiveCredential("viber");

                imRequest = new ImRequest();
                imChannel = new IMChannel();

                imChannel.sender_id = "Mookee";
                imChannel.addImage("http://assets.apifon.com/images/boy_girl.jpg");

                imRequest.addStrSubscribers(nums);
                imRequest.callback_url = callbackUrl;
                imRequest.addChannel(imChannel);

                console.log("Sending Request to Endpoint: /services/im/send");
                console.log("------ IM Request Body ------");
                printJson(imRequest);
                response = imResource.send(imRequest);
                console.log("------ Gateway Response Body ------");
                printJson(response);
                break;

            /**
             * Viber Case 3: Send IM that contains text and action button.
             */
            case "8":
                Mookee.setActiveCredential("viber");

                imRequest = new ImRequest();
                imChannel = new IMChannel();

                imAction = new IMAction();
                imAction.title = "Renew now!";
                imAction.target_url = "https://www.apifon.com";

                imChannel.text = "50% discount on our membership fee if you renew your subscription today!";
                imChannel.sender_id = "Mookee";
                imChannel.addAction(imAction);

                imRequest.addStrSubscribers(nums);
                imRequest.callback_url = callbackUrl;
                imRequest.addChannel(imChannel);

                console.log("Sending Request to Endpoint: /services/im/send");
                console.log("------ IM Request Body ------");
                printJson(imRequest);
                response = imResource.send(imRequest);
                console.log("------ Gateway Response Body ------");
                printJson(response);
                break;

            /**
             * Viber Case 4: Send IM that contains text, image and action button.
             */
            case "9":
                Mookee.setActiveCredential("viber");

                imRequest = new ImRequest();
                imChannel = new IMChannel();

                imAction = new IMAction();
                imAction.title = "Renew now!";
                imAction.target_url = "https://www.apifon.com";

                imChannel.text = "50% discount on our membership fee if you renew your subscription today!";
                imChannel.sender_id = "Mookee";
                imChannel.addImage("http://assets.apifon.com/images/boy_girl.jpg");
                imChannel.addAction(imAction);

                imRequest.addStrSubscribers(nums);
                imRequest.callback_url = callbackUrl;
                imRequest.addChannel(imChannel);

                console.log("Sending Request to Endpoint: /services/im/send");
                console.log("------ IM Request Body ------");
                printJson(imRequest);
                response = imResource.send(imRequest);
                console.log("------ Gateway Response Body ------");
                printJson(response);
                break;

            /**
             * Complete Viber example.
             */
            case "10":
                Mookee.setActiveCredential("viber");

                imRequest = new ImRequest();
                imChannel = new IMChannel();

                imAction = new IMAction();
                imAction.title = "Renew now!";
                imAction.target_url = "https://www.apifon.com";

                imChannel.id = "channelID";
                imChannel.text = "50% discount on our membership fee if you renew your subscription today!";
                imChannel.sender_id = "Mookee";
                imChannel.addImage("http://assets.apifon.com/images/boy_girl.jpg");
                imChannel.addAction(imAction);
                imChannel.ttl = 86400;
                imChannel.expiry_text = "Message Expired!!";

                subscribers = [];
                for(var i = 0; i < nums.length; i++){
                    var sub = new SubscriberInformation();
                    sub.number = nums[i];
                    sub.custom_id = "222";
                    sub.addParam("name", names[i])
                    subscribers.push(sub);
                }

                imRequest.addSubscribers(subscribers);
                imRequest.reference_id = "reference";
                imRequest.callback_url = callbackUrl;
                imRequest.addChannel(imChannel);

                console.log("Sending Request to Endpoint: /services/im/send");
                console.log("------ IM Request Body ------");
                printJson(imRequest);
                response = imResource.send(imRequest);
                console.log("------ Gateway Response Body ------");
                printJson(response);
                break;

            /**
             * Here he send a scheduled IM Request.
             */
            case "11":
                Mookee.setActiveCredential("viber");

                imRequest = new ImRequest();
                imChannel = new IMChannel();

                imAction = new IMAction();
                imAction.title = "Renew now!";
                imAction.target_url = "https://www.apifon.com";

                imChannel.text = "50% discount on our membership fee if you renew your subscription today!";
                imChannel.sender_id = "Mookee";
                imChannel.addImage("http://assets.apifon.com/images/boy_girl.jpg");
                imChannel.addAction(imAction);

                imRequest.addStrSubscribers(nums);
                imRequest.callback_url = callbackUrl;
                imRequest.addChannel(imChannel);
                imRequest.date = dateTime;

                console.log("Sending Request to Endpoint: /services/im/send");
                console.log("------ IM Request Body ------");
                printJson(imRequest);
                response = imResource.send(imRequest);
                console.log("------ Gateway Response Body ------");
                printJson(response);
                break;

            /**
             * This is an IM Deletion case.
             */
            case "12":
                Mookee.setActiveCredential("viber");

                deletionType = "";
                while(deletionType !== "0" && deletionType !== "1" && deletionType !== "2"){
                    deletionType = readlineSync.question('Do you want to delete scheduled messages using Request ID or Reference ID?\nEnter [0] for Request ID, [1] for Reference ID or [2] to exit: ');
                    if(deletionType !== "0" && deletionType !== "1" && deletionType !== "2"){
                        console.log("Invalid Option.");
                    }
                }
                if(deletionType !== "2"){
                    removeRequest = new RemoveRequest();
                    if(deletionType === "0"){
                        removeRequest.field = 'REQUEST_ID';
                        removeRequest.id = readlineSync.question('Please enter the Request ID of the scheduled message you want to delete: ');
                    }
                    else{
                        removeRequest.field = 'REFERENCE_ID';
                        removeRequest.id = readlineSync.question('Please enter the Reference ID of the scheduled message you want to delete: ');
                    }
                    console.log("Sending Request to Endpoint: /services/im/remove");
                    console.log("------ IM Remove Request Body ------");
                    printJson(removeRequest);
                    delResp = imResource.remove(removeRequest);
                    console.log("------ IM Remove Request Response ------\n" + delResp);
                }
                break;

            /**
             * In this example we send a Viber message containing a landing page.
             */
            case "13":
                Mookee.setActiveCredential("viber");

                imChannel = new IMChannel();
                imRequest = new ImRequest();

                imAction = new IMAction();
                imAction.title = "Renew now!";
                imAction.target_url = "{apifon_lp}";

                imChannel.sender_id = "Mookee";
                imChannel.text = "{name}! 50% discount on our membership fee if you renew your subscription today!";
                imChannel.addImage("http://assets.apifon.com/images/boy_girl.jpg");
                imChannel.addAction(imAction);

                subscribers = [];
                for(var i = 0; i < nums.length; i++){
                    var sub = new SubscriberInformation();
                    sub.number = nums[i];
                    sub.custom_id = "222";
                    sub.addParam("name", names[i])

                    var lp = new LandingProperties();
                    lp.url = "https://mookee.apifon.com/user/login/";
                    lp.addData("name", names2[subscribers.length]);
                    lp.redirect = true;

                    sub.setLandingPage(lp);
                    subscribers.push(sub);
                }

                imRequest.addSubscribers(subscribers);
                imRequest.callback_url = callbackUrl;
                imRequest.addChannel(imChannel);

                console.log("Sending Request to Endpoint: /services/im/send");
                console.log("------ IM Request Body ------");
                printJson(imRequest);
                response = imResource.send(imRequest);
                console.log("------ Gateway Response Body ------");
                printJson(response);
                break;

            /**
             * In this example we send a Viber message with a fallback SMS, in
             * case Viber delivery fails.
             */
            case "14":
                Mookee.setActiveCredential("viber");

                imRequest = new ImRequest();
                imChannel = new IMChannel();

                imAction = new IMAction();
                imAction.title = "Renew now!";
                imAction.target_url = "https://www.apifon.com";

                imChannel.text = "50% discount on our membership fee if you renew your subscription today!";
                imChannel.sender_id = "Mookee";
                imChannel.addImage("http://assets.apifon.com/images/boy_girl.jpg");
                imChannel.addAction(imAction);

                msgContent = new MessageContent();
                msgContent.text = "Hello There!";
                msgContent.sender_id = "Apifon";

                imRequest.addStrSubscribers(nums);
                imRequest.message = msgContent;
                imRequest.callback_url = callbackUrl;
                imRequest.addChannel(imChannel);

                console.log("Sending Request to Endpoint: /services/im/send");
                console.log("------ IM Request Body ------");
                printJson(imRequest);
                response = imResource.send(imRequest);
                console.log("------ Gateway Response Body ------");
                printJson(response);
                break;

            /**
             * In this example we send a Viber message with a landing page
             * fallback SMS, in case Viber delivery fails.
             */
            case "15":
                Mookee.setActiveCredential("viber");

                imChannel = new IMChannel();
                imRequest = new ImRequest();

                imAction = new IMAction();
                imAction.title = "Renew now!";
                imAction.target_url = "https://www.apifon.com";

                imChannel.sender_id = "Mookee";
                imChannel.text = "{name}! 50% discount on our membership fee if you renew your subscription today!";
                imChannel.addImage("http://assets.apifon.com/images/boy_girl.jpg");
                imChannel.addAction(imAction);

                subscribers = [];
                for(var i = 0; i < nums.length; i++){
                    var sub = new SubscriberInformation();
                    sub.number = nums[i];
                    sub.custom_id = "222";
                    sub.addParam("name", names[i])

                    var lp = new LandingProperties();
                    lp.url = "https://mookee.apifon.com/user/login/";
                    lp.addData("name", names2[subscribers.length]);
                    lp.redirect = true;

                    sub.setLandingPage(lp);
                    subscribers.push(sub);
                }

                msgContent = new MessageContent();
                msgContent.text = "Hello {name}! {apifon_lp}";
                msgContent.sender_id = "Apifon";

                imRequest.addSubscribers(subscribers);
                imRequest.message = msgContent;
                imRequest.callback_url = callbackUrl;
                imRequest.addChannel(imChannel);

                console.log("Sending Request to Endpoint: /services/im/send");
                console.log("------ IM Request Body ------");
                printJson(imRequest);
                response = imResource.send(imRequest);
                console.log("------ Gateway Response Body ------");
                printJson(response);
                break;

            /**
             * This is a 2-way Viber example. Any replies sent by the
             * message recipient will generate a reply-message callback
             * on the replyURL. Note that this request would require use of
             * a Viber Sender ID with 2-way messaging enabled. 2-way
             * messaging can be enabled on a Sender ID via our platform.
             */
            case "16":
                Mookee.setActiveCredential("viber");

                imRequest = new ImRequest();
                imChannel = new IMChannel();

                imAction = new IMAction();
                imAction.title = "Renew now!";
                imAction.target_url = "https://www.apifon.com";

                imChannel.text = "50% discount on our membership fee if you renew your subscription today! Would you like to renew your subscription?";
                imChannel.sender_id = "Mookee";
                imChannel.addImage("http://assets.apifon.com/images/boy_girl.jpg");
                imChannel.addAction(imAction);

                imRequest.addStrSubscribers(nums);
                imRequest.callback_url = callbackUrl;
                imRequest.reply_url = replyUrl;
                imRequest.addChannel(imChannel);

                console.log("Sending Request to Endpoint: /services/im/send");
                console.log("------ IM Request Body ------");
                printJson(imRequest);
                response = imResource.send(imRequest);
                console.log("------ Gateway Response Body ------");
                printJson(response);
                break;

            /**
             * This is a Balance Request example in which we are informed about our
             * remaining Balance and our Plafon.
             */
            case "17":
                Mookee.setActiveCredential("sms");

                var balanceResource = new BalanceResource();

                console.log("Sending Request to Endpoint: /services/balance");
                console.log("------ Balance Request Body ------\nEmpty Body");
                var balanceResp = balanceResource.send();
                console.log("------ Balance Response Body ------");
                printJson(balanceResp);
                break;

            /**
             * This is a basic OTP Create Request example. We are only setting a phone
             * number and a reference_id. Reference_id is important because it links to
             * the generated OTP.
             */
            case "18":
                Mookee.setActiveCredential("otp");

                otpRequest = new OtpRequest();

                otpRequest.reference_id = readlineSync.question('Enter a reference_id for your OTP create request: ');
                otpRequest.subscriber = nums[0];

                console.log("Sending Request to Endpoint: /services/otp/create");
                console.log("------ OTP Create Request Body ------");
                printJson(otpRequest);
                otpResp = otpResource.create(otpRequest);
                console.log("------ OTP Create Response Body ------");
                printJson(otpResp);
                break;

            /**
             * This is a complete OTP Create Request example. We are specifying every
             * field of the request to our preferences.
             */
            case "19":
                Mookee.setActiveCredential("otp");

                otpRequest = new OtpRequest();

                msgContent = new MessageContent();
                msgContent.text = "Hello There! Here is your OTP: {apifon_otp}";
                msgContent.sender_id = "Apifon";

                otpRequest.reference_id = readlineSync.question('Enter a reference_id for your OTP create request: ');
                otpRequest.subscriber = nums[0];
                otpRequest.code_length = 6;
                otpRequest.code_type = "numeric";
                otpRequest.callback_url = callbackUrl;
                otpRequest.expire = 300;
                otpRequest.message = msgContent;

                console.log("Sending Request to Endpoint: /services/otp/create");
                console.log("------ OTP Create Request Body ------");
                printJson(otpRequest);
                otpResp = otpResource.create(otpRequest);
                console.log("------ OTP Create Response Body ------");
                printJson(otpResp);
                break;

            /**
             * This is an OTP Verification Request example. When a subscriber is using
             * the OTP that we generated for him, we want to verify that the OTP is valid.
             * We are using the reference_id that we used to generate the OTP and the OTP that
             * we are provided to make this verification.
             */
            case "20":
                Mookee.setActiveCredential("otp");

                var otpReference = readlineSync.question('Enter the reference_id of the OTP you want to verify: ');
                var otpCode = readlineSync.question('Enter the OTP you want to verify: ');

                console.log("Sending Request to Endpoint: /services/otp/verify/" + otpReference + "/" + otpCode);
                console.log("------ OTP Verify Request Body ------\nEmpty Body");
                otpVerResp = otpResource.verify(otpReference, otpCode);
                console.log("------ OTP Verify Response Body ------");
                printJson(otpVerResp);
                break;
        }
    }
}catch (e) {
    if (e instanceof ApifonRestException)
        console.log(e.toString());
    else
        console.log(e)
}

function printJson(response){
    console.log(JSON.stringify(response, replacer, 4));
}

function replacer(key,value)
{
    if (value === null) return undefined;
    return value
}