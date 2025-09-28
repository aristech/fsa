

module.exports = class SubgroupSingleQuery{

    constructor(listId, groupField, optionsField) {
        this.listId = listId;
        this.groupField = groupField;
        this.optionsField = optionsField;
    }

    getSubgroupRequest(listId, groupField, optionField){
        return new SubgroupSingleQuery(listId,groupField,optionField);
    }
}