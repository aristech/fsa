'use strict';
module.exports = class AbstractSingleQuery {
    getQueryParams(){
        const queryParamsIn = {};
        if(this.fields != null && !!Object.keys(this.fields).length) {
            queryParamsIn["fields"] = this.fields.join(',');
        }
        const queryParams = [];
        for (let d in queryParamsIn)
            queryParams.push(encodeURIComponent(d) + '=' + encodeURIComponent(queryParamsIn[d]));
        return '?' + queryParams.join('&');
    }
    addVisibleField(field){
        this.fields.push(field);
        return this;
    }
    addVisibleFields(fields){
        fields.forEach(field =>{this.fields.push(field)});
        return this;
    }
};