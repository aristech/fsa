'use strict';

const SortDirection = require('../Resource/Helpers/SortDirection');

module.exports = class Sort{
    sort_dir = null;
    sort_field = null;
    constructor(sort_dir, sort_field){
        this.sort_dir = sort_dir;
        this.sort_field = sort_field;
    }
    getDefaultSort(){
        return new Sort(SortDirection.ASC, "id");
    }
};