'use strict';

module.exports = class AbstractRequest {

    constructor(){
    }

    getBody(){
        throw new Error('Unimplemented Method!');
    }

    getCreateBody(){
        throw new Error('Unimplemented Method!');
    }

    getReadBody(){
        throw new Error('Unimplemented Method!');
    }

    getUpdateBody(){
        throw new Error('Unimplemented Method!');
    }

    getDeleteBody(){
        throw new Error('Unimplemented Method!');
    }
};