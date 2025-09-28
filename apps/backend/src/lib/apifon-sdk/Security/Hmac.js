'use strict';

const crypto = require('crypto');

module.exports = class Hmac {

    static sign(message, pkey){
        var hmac = crypto.createHmac('sha256', pkey).update(message).digest('base64');
        return hmac
    }

};
