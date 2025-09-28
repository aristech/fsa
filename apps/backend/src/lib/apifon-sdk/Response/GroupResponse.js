'use strict';

const SubgroupResponse = require('./SubgroupResponse');

module.exports = class GroupResponse{
    constructor(arrayValues){
       this.assignResponse(arrayValues);
    }

    assignResponse(arrayValues){
        Object.assign(this, arrayValues);

        if (typeof arrayValues.options !== 'undefined') {
            let optionsArray = [];
            if(arrayValues.options instanceof Array){
                arrayValues.options.forEach(function(item) {
                    optionsArray.push(new SubgroupResponse(item));
                });
            }
            this.options = optionsArray;
        }
    }
};