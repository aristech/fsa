'use strict';
const Sort = require('../Sort');
const Condition = require('../../Resource/Helpers/Condition');
class SubscriberConditionQueryRequest{
    listId = null;
    page = null;
    size = null;
    conditions = null;
    fields = null;
    sort = null;
    constructor(builder){
        this.listId = builder.listId;
        this.page = builder.page;
        this.size = builder.size;
        this.conditions = builder.conditions;
        this.fields = builder.fields;
        this.sort = builder.sort;
    }
    getBody(){
        return JSON.stringify(this, replacer);
    }
}
function replacer(key,value)
{
    if (value instanceof Map){
        var mp = {};
        value.forEach((value,key)=>mp[key]=value);
        return mp}
    if (value === null) return undefined;
    return value
}
module.exports = class SubscriberConditionQueryRequestBuilder{
    listId = null;
    page = null;
    size = null;
    conditions = null;
    fields = [];
    sort = null;
    constructor(listId){
        this.listId = listId;
        this.page = 1;
        this.size = 200;
        this.conditions = [];
        this.fields = [];
        this.sort = new Sort().getDefaultSort();
    }
    getSubscriberConditionsBuilder(listId){return new SubscriberConditionQueryRequestBuilder(listId)}
    clearConditions(){
        this.conditions = [];
        return this;
    }
    withCondition(name, operator, value){
        if (operator === undefined){
            this.conditions.push(name);
            return this;
        }else{
            this.conditions.push(new Condition(name, operator, value));
            return this;
        }
    }
    withPage(page){
        this.page = page;
        return this;
    }
    withSize(size){
        this.size = size;
        return this;
    }
    withSort(sortDirection, sortField){
        if (sortField === undefined){
            this.sort = sortDirection;
            return this;
        }else{
            this.sort = new Sort(sortDirection, sortField);
            return this;
        }
    }
    build(){return new SubscriberConditionQueryRequest(this)}
    addVisibleField(field){
        this.fields.push(field);
        return this;
    }
    addVisibleFields(fields){
        fields.forEach(field =>{this.fields.push(field)});
        return this;
    }
};