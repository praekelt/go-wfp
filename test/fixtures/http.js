module.exports = function() {
    return [{
        "request": {
            "method": "GET",
            "url": "http://example.com/commcare/api/",
            "params": {
                "sender": "+27123456789",
                "message": "set  emis cer-o pul-o oil-o0",
            }
        },
        "response": {
            "code": 200,
            "data": "OK"
        }
    }];
};
