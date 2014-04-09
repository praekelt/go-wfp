module.exports = function() {
    return [{
        "request": {
            "method": "GET",
            "url": "http://example.com/commcare/api/",
            "params": {
                "sender": "+27123456789",
                "message": "set SCHOOL123 emisEMIS456 cer-o12.5 pul-o14 oil-o10",
            }
        },
        "response": {
            "code": 200,
            "data": "OK"
        }
    },{
        "request": {
            "method": "GET",
            "url": "http://example.com/commcare/api/",
            "params": {
                "sender": "+27123456789",
                "message": [
                    "hgsf1 SCHOOL123 sch30 fed20 enr-m100 enr-f150 att-m75",
                    " att-f85 ben-m70 ben-f80 nofed-a1 nofed-b2 nofed-c3",
                    " nofed-d4 nofed-e5 nofed-f6",
                ].join(""),
            }
        },
        "response": {
            "code": 200,
            "data": "OK"
        }
    },{
        "request": {
            "method": "GET",
            "url": "http://example.com/commcare/api/",
            "params": {
                "sender": "+27123456789",
                "message": [
                    "hgsf2 SCHOOL123 cer-r100 cer-u101 cer-l102 pul-r200",
                    " pul-u201 pul-l202 oil-r300 oil-u301 oil-l302",
                ].join(""),
            }
        },
        "response": {
            "code": 200,
            "data": "OK"
        }
    }];
};
