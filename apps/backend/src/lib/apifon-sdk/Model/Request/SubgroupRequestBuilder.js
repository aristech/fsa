
class SubgroupRequest{
    constructor(builder) {
        this.listId = builder.listId;
        this.groupField = builder.groupField;
        this.optionsField = builder.optionsField;
        this.name = builder.name;
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


module.exports = class SubgroupRequestBuilder{

    listId = null;
    groupField = null;
    optionsField = null;
    name = null;

    constructor(name, groupField,optionsField ,listId) {
        this.name = name;
        this.groupField = groupField;
        this.optionsField = optionsField;
        this.listId = listId;
    }

    getAddRequestBuilder(listId, groupField, name){
        return new SubgroupRequestBuilder(name,groupField,null,listId);
    }

    getUpdateRequestBuilder(listId, groupField, optionsField, name){
        return new SubgroupRequestBuilder(name, groupField,optionsField,listId);
    }

    build(){
        return new SubgroupRequest(this);
    }

}