'use strict';

const AbstractRequest = require('./AbstractRequest');
var SubscriberInformation = require('./SubscriberInformation');

module.exports = class SubscribersViewRequest extends AbstractRequest  {

    constructor(){
        super();
        this.subscribers = [];
    }

    addSubscribers(subscribers){
        for(var i = 0;i<subscribers.length;i++){
            this.subscribers.push(subscribers[i]);
        }
    }

    addStrSubscribers(subscribers){
        for(var i = 0;i<subscribers.length;i++){
            var sub = new SubscriberInformation();
            sub.number = subscribers[i];
            this.subscribers.push(sub);
        }
    }

    addSubscriber(subscriber){

        if (subscriber ==  typeof SubscriberInformation) {

            this.subscribers.push(subscriber);

        }else if (subscriber == typeof String){

            var sub = new SubscriberInformation();
            sub.number = entry;
            this.subscribers.push(sub);

        }

    }
};
