/**
 * This is a complete example on how to use the APIFON SDK for the List, Subscriber and Bounce list REST API.
 * For further questions , please visit https://docs.apifon.com/
 */
'use strict';
var readlineSync = require('readline-sync');
var Mookee = require('../Mookee');

const ApifonRestException = require('../Exception/ApifonRestException');
const ApiErrorResponse = require('../Response/ApiErrorResponse');

const ListResource = require('../Resource/ListResource');
const ListRequestBuilder = require('../Model/Request/ListRequestBuilder');
const {CampaignDefaults,CampaignDefaultsBuilder} = require('../Model/Request/CampaignDefaultsBuilder');
const {GdprProperties,GdprPropertiesBuilder} = require('../Model/Request/GdprPropertiesBuilder');
const ListSingleQuery = require('../Model/Request/ListSingleQuery');
const ListQueryBuilder = require('../Model/Request/ListQueryBuilder');
const SubscriberFieldRequestBuilder = require('../Model/Request/SubscriberFieldRequestBuilder');
const SubscriberFieldResource = require('../Resource/SubscriberFieldResource');
const GdprFieldRequestBuilder = require('../Model/Request/GdprFieldRequestBuilder');
const GdprFieldResource = require('../Resource/GdprFieldResource');
const GroupRequestBuilder = require('../Model/Request/GroupRequestBuilder');
const GroupSingleQuery = require('../Model/Request/GroupSingleQuery');
const GroupResource = require('../Resource/GroupResource');
const SubgroupRequestBuilder = require('../Model/Request/SubgroupRequestBuilder');
const SubgroupSingleQuery = require('../Model/Request/SubgroupSingleQuery');
const SubgroupResource = require('../Resource/SubgroupResource');


Mookee.getInstance();
Mookee.addCredentials("token", "your_client_token", "your_secret_key");
Mookee.setActiveCredential("token");


const SubscriberResource = require('../Resource/SubscriberResource');
const SubscriberRequestBuilder = require('../Model/Request/SubscriberRequestBuilder');
const SubscriberSingleQuery = require('../Model/Request/SubscriberSingleQuery');
const SubscriberQueryBuilder = require('../Model/Request/SubscriberQueryBuilder');
const SubscriberConditionQueryRequestBuilder = require('../Model/Request/SubscriberConditionQueryRequestBuilder');
const ConditionOperator = require('../Resource/Helpers/ConditionOperator');

const BounceListResource = require('../Resource/BounceListResource');
const BounceRequestBuilder = require('../Model/Request/BounceRequestBuilder');
const BounceQueryBuilder = require('../Model/Request/BounceQueryBuilder');
const BounceSingleQuery = require('../Model/Request/BounceSingleQuery');
/*
Helpers
 */
const ListType = require('../Resource/Helpers/ListType');
const SubscriberStatus = require('../Resource/Helpers/SubscriberStatus');
const SubscriberFieldType = require('../Resource/Helpers/SubscriberFieldType');
const SortDirection = require('../Resource/Helpers/SortDirection');
const BounceReason = require('../Resource/Helpers/BounceReason');
const BounceType = require('../Resource/Helpers/BounceType');
const GroupType = require('../Resource/Helpers/GroupType');
const GroupOptionsOrientation = require('../Resource/Helpers/GroupOptionsOrientation');
const SelectionType = require('../Resource/Helpers/SelectionType');

var listResource = new ListResource();
var subscriberFieldResource = new SubscriberFieldResource();
var gdprFieldResource = new GdprFieldResource();
var subscriberResource = new SubscriberResource();
var bounceListResource = new BounceListResource();
var groupResource = new GroupResource();
var subgroupResource = new SubgroupResource();

var listId = 'MY_LIST'; //A List just not to add it every time. If you dont have a list yet, first create one and then add it here.
var groupField = 'MY_GROUP';// A group so that you dont add one every time. If you don't already have a group, create one and then add it here.
var subgroupField = "MY_SUBGROUP"; // A subgroup so that you dont add one every time. If you don't already have a subgroup, create one and then add it here.

var choice =  "1";
var request;
var resp;
var uri;
var ListQuery;

while (choice !== "0") {
    console.log("------ Menu ------");
    console.log("0.  Exit");
    console.log("1.  Change default listId");
    console.log("2.  Search a list");
    console.log("3.  Create a list");
    console.log("4.  Update the title of a list");
    console.log("5.  Remove a list");
    console.log("6.  Search all lists");
    console.log("7.  Add subscriber and gdpr fields");
    console.log("8.  Update subscriber and gdpr fields");
    console.log("9.  Delete subscriber field");
    console.log("10. Add group");
    console.log("11. Update group");
    console.log("12. Get group");
    console.log("13. Remove group")
    console.log("14. Add subgroup to group")
    console.log("15. Add subgroups to group")
    console.log("16. Get subgroup")
    console.log("17. Update subgroup")
    console.log("18. Remove subgroup")
    console.log("19. Search a subscriber");
    console.log("20. Create a subscriber");
    console.log("21. Update a subscriber");
    console.log("22. Delete a subscriber");
    console.log("23. Search all subscribers");
    console.log("24. Search all subscribers under conditions");
    console.log("25. Subscribe/Unsubscribe subscriber");
    console.log("26. Block subscriber");
    console.log("27. Get all blocked subscribers");
    console.log("28. Get a blocked subscriber by destination");
    console.log("29. Unblock subscriber");
    choice = readlineSync.question('Choice: ');
    try {
        switch (choice) {
            //Exit Loop
            case "0":
                console.log("------ Goodbye ------");
                break;

            case "1":
                console.log("Default listId: " + listId);
                var listIdNew = "";
                listIdNew = readlineSync.question('Do you want to change the default ListId? If not enter [0] as response ');
                if (listIdNew === "0")
                    break;
                else
                    listId = listIdNew;
                break;

            case "2":
                console.log("------ Searching list with id " + listId + " ------");
                ListQuery = new ListSingleQuery().getListRequest(listId);
                resp = listResource.getList(ListQuery);
                console.log("------ List Response Body ------");
                console.log(resp);
                break;
            case "3":
                console.log("------ Create List ------");
                var listTitle = "";
                listTitle = readlineSync.question('What is the title of the new list you want to create? ');
                request = new ListRequestBuilder().getAddListRequestBuilder(ListType.ADVANCED, listTitle, "30")
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
                resp = listResource.getByResourceUri(createdListURI);
                console.log("------ List Response Body ------");
                console.log(resp);
                break;

            case "4":
                var title = "";
                title = readlineSync.question('Enter new title for the list {list_id}: '.replace("{list_id}", listId));
                //First we get the list to create a new request with all the pre existing fields.
                //If we want to create from scratch all the fields of the request (all non placed fields will be removed)
                //We should call the getUpdateListRequestBuilder(listId) with the list id as parameter so we get an empty request
                ListQuery = new ListSingleQuery().getListRequest(listId);
                var listResponse = listResource.getList(ListQuery);
                request = new ListRequestBuilder().getUpdateListRequestBuilder(listResponse)
                    .withTitle(title) //Now we add the new field we want to update
                    .build();
                var updatedListURI = listResource.updateList(request);
                resp = listResource.getByResourceUri(updatedListURI);
                console.log("------ List Response Body ------");
                console.log(resp);
                break;
            case "5":
                console.log("------ Remove List ------");
                var removeListResponse = listResource.removeList(listId);
                if (removeListResponse) {
                    console.log('--------- list with id: ' + listId + ' successfully deleted ----------')
                } else {
                    console.log('something went wrong')
                }
                break;
            case "6":
                console.log("------ Search all lists ------");
                var size = 0;
                size = readlineSync.question('How many results per page you want? ');
                request = new ListQueryBuilder().getBuilder()
                    .setSize(size)
                    .setSort("title", SortDirection.ASC)
                    .build();
                resp = listResource.getLists(request);
                //Now let's create a loop to navigate inside the pages of the paginated result
                var ex = 0;
                while (ex === 0) {
                    if (resp.meta.total > size) {
                        var showResults = "";
                        while (showResults !== "Y" && showResults !== "N") {
                            console.log('Page ' + resp.meta.page + ' of ' + (Math.floor(resp.meta.total / size) + 1));
                            showResults = readlineSync.question('Do you want to see the results of this page? [Y/N]: ');
                            if (showResults === "Y") {
                                console.log(resp.results);
                                break;
                            }
                        }
                        var anotherPage = "";
                        while (anotherPage !== "next" || anotherPage !== "prev" || anotherPage !== "no") {
                            anotherPage = readlineSync.question('Do you want to see [next/prev] pages? For exit enter [no]');
                            if (anotherPage === "no") {
                                ex = 1;
                                break;
                            }
                            if (anotherPage === "next") {
                                resp = listResource.getLists(resp.links.next);
                                break;
                            }
                            if (anotherPage === "prev") {
                                resp = listResource.getLists(resp.links.prev);
                                break;
                            }
                        }
                    } else {
                        showResults = "";
                        while (showResults !== "Y" && showResults !== "N") {
                            console.log('Page ' + resp.meta.page);
                            showResults = readlineSync.question('Do you want to see the results of this page? [Y/N]: ');
                            if (showResults === "Y") {
                                console.log(resp.results);
                                break;
                            }
                        }
                        ex = 1;
                    }
                }
                break;
            case "7":
                console.log("------ Add [First name] as a subscriber field ------");
                request = new SubscriberFieldRequestBuilder().getAddRequestBuilder(listId, SubscriberFieldType.TEXT, 20, "First Name")
                    .build();
                resp = subscriberFieldResource.addSubscriberField(request);
                if (resp)
                    console.log("------ Subscriber field added successfully ------");
                console.log("------ Add [Offers] as a gdpr field ------");
                request = new GdprFieldRequestBuilder().getAddGdprFieldRequestBuilder("Offers", listId)
                    .withDescription("Information about our running offers.")
                    .build();
                resp = gdprFieldResource.addGdprField(request);
                if (resp)
                    console.log("------ Gdpr field added successfully ------");
                break;
            case "8":
                console.log("------ Update subscriber field [First name] to [Last name] ------");
                request = new SubscriberFieldRequestBuilder().getUpdateSubscriberFieldRequestBuilder(listId, "FIRST_NAME", "Last Name", 20)
                    .build();
                resp = subscriberFieldResource.updateSubscriberField(request);
                if (resp)
                    console.log("------ Subscriber field updated successfully ------");
                console.log("------ Update gdpr field [Offers] to [New Offers] ------");
                request = new GdprFieldRequestBuilder().getUpdateGdprFieldRequestBuilder("New Offers", listId, "OFFERS")
                    .build();
                resp = gdprFieldResource.updateSubscriberField(request);
                if (resp)
                    console.log("------ Gdpr field updated successfully ------");
                break;
            case "9":
                console.log("------ Delete subscriber field [FIRST_NAME] ------");
                resp = subscriberFieldResource.removeSubscriberField(listId, "FIRST_NAME");
                if (resp)
                    console.log("------ Subscriber field deleted successfully ------");
                break;
            case "10":
                console.log("------ Add group ------");
                request = new GroupRequestBuilder().getAddRequestBuilder(listId,"group name",GroupType.GROUP)
                    .withGroupOptionsOrientation(GroupOptionsOrientation.DROPDOWN_LIST)
                    .withSelectionType(SelectionType.MULTIPLE);

                uri = groupResource.addGroup(request.build());
                if (uri)
                    resp = groupResource.getByResourceUri(uri)
                    console.log("------ Group added ------");
                    console.log(resp);
                break;
            case "11":
                console.log("------ Update group ------");
                //updating a group happens via its group field. we can either add the group response to the
                //builder or add all the fields ourselves.

                request = new GroupRequestBuilder().getUpdateRequestBuilder(listId,groupField,"my updated group",GroupType.GROUP)
                uri = groupResource.updateGroup(request.build());
                if (uri)
                    resp = groupResource.getByResourceUri(uri)
                console.log("------ Group updated ------");
                console.log(resp);
                break;

            case "12":
                console.log("------ Get group ------");
                request = new GroupSingleQuery().getGroupRequest(listId,groupField);

                resp = groupResource.getGroup(request);
                console.log(resp);
                break;

            case "13":
                console.log("------ Remove group ------");

                if(groupResource.removeGroup(listId,groupField)){
                    console.log("group removed");
                }
                break;
            case "14":
                console.log("------ Add subgroup ------");
                request = new SubgroupRequestBuilder().getAddRequestBuilder(listId,groupField,"subgroup name");

                uri = subgroupResource.addSubgroup(request.build());
                if (uri)
                    resp = subgroupResource.getByResourceUri(uri)
                console.log("------ Subgroup added ------");
                console.log(resp);
                break;
            case "15":
                console.log("------ Add subgroups------");
                let subgroups = ["subgroup1", "subgroup2"];
                request = new SubgroupRequestBuilder().getAddRequestBuilder(listId,groupField,subgroups);

                uri = subgroupResource.addSubgroups(request.build());
                if (uri)
                    console.log("subgroups added");
                break;
            case "16":
                console.log("------ Get subgroup------")
                request = new SubgroupSingleQuery().getSubgroupRequest(listId,groupField,subgroupField);

                resp = subgroupResource.getSubgroup(request)
                if (resp)
                    console.log("the subgroup...\n");
                    console.log(resp)
                break;
            case "17":
                console.log("------ Update subgroup------")
                request = new SubgroupRequestBuilder().getUpdateRequestBuilder(listId,groupField,subgroupField,"updated subgroup name");

                uri = subgroupResource.updateSubgroup(request.build());
                if (uri)
                    console.log("subgroup updated successfully");
                break;
            case "18":
                console.log("------ Remove subgroup------")

                if(subgroupResource.removeSubgroup(listId,groupField,subgroupField)){
                    console.log("subgroup removed")
                }
                break;

            case "19":
                console.log("------ Searching subscriber of list with listId: " + listId + " ------");
                var MD5 = "";
                MD5 = readlineSync.question('Please enter destination_id/email_id: ');
                //If we want to get a partial response with only the id/destination/destination_id fields
                request = new SubscriberSingleQuery().getSubscriberLookup(MD5, listId);
                request.addVisibleFields(["id", "destination", "destination_id"]);
                resp = subscriberResource.getSubscriber(request);
                console.log("------ Subscriber response body ------");
                console.log(resp);
                break;
            case "20":
                console.log("------ Create subscriber ------");
                var destination = "";
                var email = "";
                destination = readlineSync.question('Please enter the destination number: ');
                email = readlineSync.question('Please enter the email: ');
                //First, get the list so we could get the subscriber and gdpr properties
                ListQuery = new ListSingleQuery().getListRequest(listId);
                var list = listResource.getList(ListQuery);
                var subscriberRequestBuilder = new SubscriberRequestBuilder().getAddSubscriberRequestBuilder(listId)
                    .withDestination(destination, SubscriberStatus.SUBSCRIBED)
                    .withEmail(email, SubscriberStatus.SUBSCRIBED);
                //Add value to the gdpr and subscriber fields of the list.
                if (list.gdpr_fields !== undefined) {
                    list.gdpr_fields.forEach(function (value) {
                        subscriberRequestBuilder.withGdprField(value.field, true)
                    })
                }
                if (list.subscriber_fields !== undefined) {
                    list.subscriber_fields.forEach(function (value) {
                        subscriberRequestBuilder.withSubscriberField(value.field, getRandomSubscriberValue(value.type))
                    })
                }
                //Add subscriber to all the group options of the list
                if(list.groups !== undefined){
                    let optionsArray = [];
                    list.groups.forEach(function (group) {
                        if(group.options !== undefined){
                            group.options.forEach(function(option){
                                optionsArray.push(option.field);
                            })
                        }
                    })
                    subscriberRequestBuilder.withGroupOptions(optionsArray);
                }

                request = subscriberRequestBuilder.build();
                var addSubscriberResource = subscriberResource.addSubscriber(request);
                resp = subscriberResource.getByResourceUri(addSubscriberResource);
                console.log("------ Subscriber response body ------");
                console.log(resp);
                break;
            case "21":
                console.log("------ Update subscriber ------");
                MD5 = "";
                MD5 = readlineSync.question('Please enter destination_id/email_id: ');
                var newName = "";
                newName = readlineSync.question('Please enter the first name of the subscriber: ');
                request = new SubscriberSingleQuery().getSubscriberLookup(MD5, listId);
                var subscriber = subscriberResource.getSubscriber(request);
                request = new SubscriberRequestBuilder().getBuilderFromSubscriber(subscriber)
                    .withSubscriberField("FIRST_NAME", newName)
                    .build();
                var updatedSubscriberUri = subscriberResource.updateSubscriber(request);
                resp = subscriberResource.getByResourceUri(updatedSubscriberUri);
                console.log("------ Subscriber response body ------");
                console.log(resp);
                break;
            case "22":
                console.log("------ Delete subscriber ------");
                MD5 = "";
                MD5 = readlineSync.question('Please enter destination_id/email_id: ');
                var removeSubscriberResponse = subscriberResource.removeSubscriber(listId, MD5);
                if (removeSubscriberResponse) {
                    console.log('--------- Subscriber with id: ' + MD5 + ' successfully deleted ----------')
                } else {
                    console.log('something went wrong')
                }
                break;
            case "23":
                console.log("------ Search all subscribers ------");
                size = 0;
                size = readlineSync.question('How many results per page you want? ');
                request = new SubscriberQueryBuilder().getQueryBuilder(listId)
                    .setSize(size)
                    // .addVisibleFields(["id", "destination", "destination_id"])
                    .build();
                resp = subscriberResource.querySubscribers(request);
                //Now let's create a loop to navigate inside the pages of the paginated result
                ex = 0;
                while (ex === 0) {
                    if (resp.meta.total > size) {
                        showResults = "";
                        while (showResults !== "Y" && showResults !== "N") {
                            console.log('Page ' + resp.meta.page + ' of ' + (Math.floor(resp.meta.total / size) + 1));
                            showResults = readlineSync.question('Do you want to see the results of this page? [Y/N]: ');
                            if (showResults === "Y") {
                                console.log(resp.results);
                                break;
                            }
                        }
                        anotherPage = "";
                        while (anotherPage !== "next" || anotherPage !== "prev" || anotherPage !== "no") {
                            anotherPage = readlineSync.question('Do you want to see [next/prev] pages? For exit enter [no]');
                            if (anotherPage === "no") {
                                ex = 1;
                                break;
                            }
                            if (anotherPage === "next") {
                                resp = subscriberResource.querySubscribers(resp.links.next);
                                break;
                            }
                            if (anotherPage === "prev") {
                                resp = subscriberResource.querySubscribers(resp.links.prev);
                                break;
                            }
                        }
                    } else {
                        showResults = "";
                        while (showResults !== "Y" && showResults !== "N") {
                            console.log('Page ' + resp.meta.page);
                            showResults = readlineSync.question('Do you want to see the results of this page? [Y/N]: ');
                            console.log("showResults", showResults);
                            if (showResults === "Y") {
                                console.log(resp.results);
                                break;
                            }
                        }
                        ex = 1;
                    }
                }
                break;
            case "24":
                console.log("------ Search all subscribers under condition ------");
                // var beginWith = '';
                // beginWith = readlineSync.question('What is the prefix that you want all the destinations of the result to begin with? ');
                builder = new SubscriberConditionQueryRequestBuilder().getSubscriberConditionsBuilder(listId);
                //We can select other/multiple Condition operators or fields to apply those.
                //Loot at Resource/Helpers/ConditionOperator.js
                var condition = '';
                do {
                    condition = readlineSync.question('Do you want to get all the subscribers with destination subscribed, or all the subscribers that the destination start with 30695? [1/2]: ');
                } while (condition !== '1' && condition !== '2');
                if (condition === '1') {
                    builder.withCondition("status", ConditionOperator.eq, "SUBSCRIBED");
                }
                if (condition === '2') {
                    builder.withCondition("destination", ConditionOperator.beginsWith, "30695");
                }

                //Add partial response
                // request.addVisibleFields(["id","destination"])
                request = builder.build();
                resp = subscriberResource.querySubscribersWithConditions(request);
                console.log(resp);
                break;
            case "25":
                console.log("------ Subscribe/Unsubscribe ------");
                MD5 = "";
                MD5 = readlineSync.question('Please enter destination_id/email_id you want to subscribe/unsubscribe: ');
                var action = '';
                do {
                    action = readlineSync.question('Enter if you want to subscribe or unsubscribe the subscriber [S/U]: ');
                } while (action !== 'S' && action !== 'U');
                if (action === 'S') {
                    console.log("------ Subscribe the subscriber with lookupMD5: " + MD5 + " ------");
                    var subscribeResponse = subscriberResource.subscribeSubscriber(listId, MD5);
                    subscribeResponse ? console.log("Subscriber successfully subscribed") : console.log("Something went wrong")
                } else {
                    console.log("------ Unsubscribe the subscriber with lookupMD5: " + MD5 + " ------");
                    var unsubscribeResponse = subscriberResource.unsubscribeSubscriber(listId, MD5);
                    unsubscribeResponse ? console.log("Subscriber successfully unsubscribed") : console.log("Something went wrong")
                }
                break;
            case "26":
                console.log("------ Blocking a subscriber ------");
                destination = "";
                destination = readlineSync.question('Please enter destination/email you want to block: ');
                //There are other bounce reasons. See Resource/Helpers/BounceReason.js
                request = new BounceRequestBuilder().getBounceRequestBuilder(destination, BounceReason.other)
                    .withDescription("Blocked from the sdk")
                    .build();
                resp = bounceListResource.addBounceSubscriber(request);
                resp ? console.log("Subscriber blocked unsubscribed") : console.log("Something went wrong")
                break;
            case "27":
                console.log("------ Get all blocked subscribers ------");
                var builder = new BounceQueryBuilder().getBuilder();
                var type = '';
                while (type !== "E" && type !== "D") {
                    type = readlineSync.question('Do you want to get al the blocked emails or destinations [E/D] ?: ');
                }
                if (type === 'E')
                    builder.withType(BounceType.EMAIL);
                else
                    builder.withType(BounceType.MOBILE);
                size = 0;
                size = readlineSync.question('How many results per page you want? ');
                //Add a partial response
                builder.addVisibleFields(["destination", "user"]);
                builder.setSize(size);
                request = builder.build();
                resp = bounceListResource.getBounceSubscribers(request);
                ex = 0;
                //Now let's create a loop to navigate inside the pages of the paginated result
                while (ex === 0) {
                    if (resp.meta.total > size) {
                        showResults = "";
                        while (showResults !== "Y" && showResults !== "N") {
                            console.log('Page ' + resp.meta.page + ' of ' + (Math.floor(resp.meta.total / size) + 1));
                            showResults = readlineSync.question('Do you want to see the results of this page? [Y/N]: ');
                            if (showResults === "Y") {
                                console.log(resp.results);
                                break;
                            }
                        }
                        anotherPage = "";
                        while (anotherPage !== "next" || anotherPage !== "prev" || anotherPage !== "no") {
                            anotherPage = readlineSync.question('Do you want to see [next/prev] pages? For exit enter [no]');
                            if (anotherPage === "no") {
                                ex = 1;
                                break;
                            }
                            if (anotherPage === "next") {
                                resp = subscriberResource.querySubscribers(resp.links.next);
                                break;
                            }
                            if (anotherPage === "prev") {
                                resp = subscriberResource.querySubscribers(resp.links.prev);
                                break;
                            }
                        }
                    } else {
                        if (resp.meta.total !== 0) {
                            showResults = "";
                            while (showResults !== "Y" && showResults !== "N") {
                                showResults = readlineSync.question('Do you want to see the results? [Y/N]: ');
                                console.log("showResults", showResults);
                                if (showResults === "Y") {
                                    console.log(resp.results);
                                    break;
                                }
                            }
                        } else {
                            console.log("No results")
                        }
                        ex = 1;
                    }
                }
                break;
            case "28":
                console.log("------ Get blocked subscriber by destination ------");
                destination = "";
                destination = readlineSync.question('Please enter destination/email of the subscriber: ');
                request = new BounceSingleQuery().getBounceLookup(destination);
                request.addVisibleFields(["description", "destination"]);
                resp = bounceListResource.getBounceSubscriber(request);
                console.log(resp);
                break;
            case "29":
                console.log("------ Unblock subscriber ------");
                destination = "";
                destination = readlineSync.question('Please enter destination/email of the subscriber you want to unblock: ');
                resp = bounceListResource.removeBounceSubscriber(destination);
                resp ? console.log("Blocked subscriber successfully removed") : console.log("Something went wrong")
        }
    } catch (e) {
        if (e instanceof ApifonRestException)
            console.log(e.toString());
        else
            console.log(e)
    }
}

function getRandomSubscriberValue(type) {
    var randStr = Math.random().toString(36).substring(7);
    switch (type) {
        case "NUMBER":
            return Math.floor(Math.random()*10);
        case "TEXT":
            return randStr;
        case "DATE":
            return new Date();
        case "EMAIL":
            return randStr + "@domain.com";
        case "URL":
            return "http://192.168.1.1/" + randStr;
        case "MOBILE_NUMBER":
            return "695" + Math.random().toString().slice(2,9);
        default:
            return randStr;
    }
}