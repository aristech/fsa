'use strict';

const DeviceTarget = require('../Resource/Helpers/DeviceTarget');
const ApifonRestException = require('../Exception/ApifonRestException');

module.exports = class IMChannel {

    constructor(){
        this.id = null;
        this.sender_id = null;
        this.text = null;
        this.images = null;
        this.actions = null;
        this.ttl = null;
        this.expiry_text = null;
        this.device_target = null;
    }

    addImage(image){
        if(this.images == null){
            this.images = [];
        }
        this.images.push(image);
    }

    addAction(action){
        if(this.actions == null){
            this.actions = [];
        }
        this.actions.push(action);
    }

    addDeviceTarget(device_target){
        if(DeviceTarget.hasOwnProperty(device_target) || null) {
            this.device_target = device_target;
        } else {;
            let DeviceTargetString = Object.keys(DeviceTarget).join(', ')
            throw new ApifonRestException(`Invalid Device Target. Should be of a value of DeviceTarget ${DeviceTargetString}`);
        }

    }

};

