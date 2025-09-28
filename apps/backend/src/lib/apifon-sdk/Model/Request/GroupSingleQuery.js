

module.exports = class GroupSingleQuery{
    constructor(listId, groupField) {
        this.listId = listId;
        this.groupField = groupField;
    }

    getGroupRequest(listId, groupField){
        return new GroupSingleQuery(listId,groupField);
    }

}