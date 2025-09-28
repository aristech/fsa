
const GroupType = require('../../Resource/Helpers/GroupType');
const SelectionType = require('../../Resource/Helpers/SelectionType');
const GroupOptionsOrientation = require('../../Resource/Helpers/GroupOptionsOrientation');

class GroupRequest{
    constructor(builder) {
        this.listId = builder.listId;
        this.groupField = builder.groupField;
        this.name = builder.name;
        this.type = builder.type;
        this.internal = builder.internal;
        this.selectionType = builder.selectionType;
        this.groupOptionsOrientation = builder.groupOptionsOrientation;
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

module.exports = class GroupRequestBuilder{

    listId = null;
    groupField = null;
    name = null;
    type = null;
    internal = null
    selectionType = null;
    groupOptionsOrientation = null;

    constructor(listId, groupField, name, type) {
        this.listId = listId;
        this.groupField = groupField;
        this.name = name;
        this.type = type;
    }

    getAddRequestBuilder(listId, name, type = GroupType.GROUP){
        return new GroupRequestBuilder(listId,null,name,type)
    }

    getUpdateRequestBuilder(listId, groupField, name, type= GroupType.GROUP){
        return new GroupRequestBuilder(listId,groupField,name,type)
    }

    getUpdateRequestBuilderFromResponse(groupResponse, listId){
        return new GroupRequestBuilder(listId,groupResponse.field,groupResponse.name,groupResponse.type)
            .withInternal(groupResponse.internal)
            .withSelectionType(groupResponse.selectionType)
            .withGroupOptionsOrientation(groupResponse.groupOptionsOrientation);
    }

    withName(name){
        this.name = name;
        return this;
    }

    withType(type= GroupType.GROUP){
        this.type = type;
        return this;
    }

    withInternal(internal){
        this.internal = internal;
        return this;
    }

    withSelectionType(selectionType = SelectionType.SINGLE){
        this.selectionType = selectionType;
        return this;
    }

    withGroupOptionsOrientation(groupOptionsOrientation = GroupOptionsOrientation.VERTICAL){
        this.groupOptionsOrientation = groupOptionsOrientation;
        return this;
    }

    build(){
        return new GroupRequest(this);
    }


}