module.exports = function() {
    var answers = {};

    answers.registration = {
        "states:register:school_id": "SCHOOL123",
        "states:register:emis": "EMIS456",
        "states:register:cereal:opening": 12.5,
        "states:register:pulses:opening": 14,
        "states:register:oil:opening": 10,
    };

    answers.report = {
        "states:report:school_id": "SCHOOL123",
        "states:report:days_in_session": 30,
        "states:report:days_of_feeding": 20,
        "states:report:enrollment_male": 100,
        "states:report:enrollment_female": 150,
        "states:report:attendance_male": 75,
        "states:report:attendance_female": 85,
        "states:report:beneficiaries_male": 70,
        "states:report:beneficiaries_female": 80,
        "states:report:not_fed:lack_of_food": 1,
        "states:report:not_fed:lack_of_firewood": 2,
        "states:report:not_fed:lack_of_water": 3,
        "states:report:not_fed:cooks_absent": 4,
        "states:report:not_fed:pupils_dislike_food": 5,
        "states:report:not_fed:other": 6,
        "states:report:cereal:received": 100.0,
        "states:report:cereal:used": 101.0,
        "states:report:cereal:losses": 102.0,
        "states:report:pulses:received": 200.0,
        "states:report:pulses:used": 201.0,
        "states:report:pulses:losses": 202.0,
        "states:report:oil:received": 300.0,
        "states:report:oil:used": 301.0,
        "states:report:oil:losses": 302.0,
    };

    return answers;
};
