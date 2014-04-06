var assert = require('assert');
var _ = require("lodash");
var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var AppTester = vumigo.AppTester;


describe("app", function() {
    describe("GoApp", function() {
        var app;
        var tester;

        beforeEach(function() {
            app = new go.app.GoApp();

            tester = new AppTester(app);

            tester
                .setup.config.app({
                    name: 'test_app'
                })
                .setup(function(api) {
                    fixtures().forEach(api.http.fixtures.add);
                });
        });

        describe("when the user starts a session", function() {
            it("should show them the start menu", function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:start',
                        reply: [
                            'Welcome to the World Feed Program.',
                            '1. Register',
                            '2. Report',
                            '3. Exit'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when the user is at the start menu", function() {
            describe("when the user selects registration", function() {
                it("should show the first registration question", function() {
                    return tester
                        .setup.user.state('states:start')
                        .input('1')
                        .check.interaction({
                            state: 'states:register',
                            reply: 'Registration not supported yet.',
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });

            describe("when the user selects reporting", function() {
                it("should show the first reporting question", function() {
                    return tester
                        .setup.user.state('states:start')
                        .input('2')
                        .check.interaction({
                            state: 'states:report:school_id',
                            reply: 'School ID:',
                        })
                        .run();
                });
            });

            describe("when the user asks to exit", function() {
                it("should say thank you and end the session", function() {
                    return tester
                        .setup.user.state('states:start')
                        .input('3')
                        .check.interaction({
                            state: 'states:end',
                            reply: 'Bye!'
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });
        });

        describe("when the user is filing a report", function() {
            var report_name = null;

            function display_state_correctly(reply) {
                return function() {
                    var state_name = 'states:report:' + report_name;
                    var expected_answers;
                    return tester
                        .setup.user(function (user) {
                            expected_answers = _(user.answers || {}).clone();
                            return user;
                        })
                        .setup.user.state(state_name)
                        .input(null)
                        .check.reply(reply)
                        .check.user(function (user) {
                            assert.deepEqual(user.answers, expected_answers);
                        })
                        .check.user.state(state_name)
                        .run();
                };

            }

            function accept_report_answer(content, answer) {
                return function() {
                    var state_name = 'states:report:' + report_name;
                    var expected_answers;
                    return tester
                        .setup.user(function (user) {
                            expected_answers = _(user.answers || {}).clone();
                            expected_answers[state_name] = answer;
                            return user;
                        })
                        .setup.user.state(state_name)
                        .input(content)
                        .check.user(function (user) {
                            assert.deepEqual(user.answers, expected_answers);
                        })
                        .check(function (api, im, app) {
                            var next_state = app.next_report_state(state_name);
                            assert.equal(im.user.state.name, next_state);
                        })
                        .run();
                };
            }

            function reject_report_answer(content) {
                return function() {
                    var state_name = 'states:report:' + report_name;
                    var expected_answers;
                    return tester
                        .setup.user(function (user) {
                            expected_answers = _(user.answers || {}).clone();
                            return user;
                        })
                        .setup.user.state(state_name)
                        .input(content)
                        .check.user.state(state_name)
                        .check.user(function (user) {
                            assert.deepEqual(user.answers, expected_answers);
                        })
                        .run();
                };
            }

            describe("when answering school_id", function() {
                beforeEach(function() {
                    report_name = "school_id";
                });

                it("should display state correctly",
                   display_state_correctly("School ID:"));

                it("should accept 12345 as an answer",
                   accept_report_answer("12345", "12345"));
            });

            describe("when answering days_in_session", function() {
                beforeEach(function() {
                    report_name = "days_in_session";
                });

                it("should display state correctly",
                   display_state_correctly("Number of school days in session:")
                );

                it("should accept 12 as an answer",
                   accept_report_answer("12", 12));

                it("should reject 0 as an answer",
                   reject_report_answer("0"));

                it("should reject 32 as an answer",
                   reject_report_answer("32"));

                it("should reject FOO as an answer",
                   reject_report_answer("FOO"));
            });

            describe("when answering days_of_feeding", function() {
                beforeEach(function() {
                    report_name = "days_of_feeding";
                    tester.setup.user.answers({
                        'states:report:days_in_session': 5
                    });
                });

                it("should display state correctly",
                   display_state_correctly("Number of days food served:")
                );

                it("should accept 5 as an answer",
                   accept_report_answer("5", 5));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 6 as an answer",
                   reject_report_answer("6"));

                it("should reject FOO as an answer",
                   reject_report_answer("FOO"));
            });

            describe("when answering enrollment_male", function() {
                beforeEach(function() {
                    report_name = "enrollment_male";
                });

                it("should display state correctly",
                   display_state_correctly("Male enrollment:")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 10000 as an answer",
                   accept_report_answer("10000", 10000));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 10001 as an answer",
                   reject_report_answer("10001"));

                it("should reject 1.1 as an answer",
                   reject_report_answer("1.1"));
            });

            describe("when answering enrollment_female", function() {
                beforeEach(function() {
                    report_name = "enrollment_female";
                });

                it("should display state correctly",
                   display_state_correctly("Female enrollment:")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 10000 as an answer",
                   accept_report_answer("10000", 10000));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 10001 as an answer",
                   reject_report_answer("10001"));

                it("should reject 1.1 as an answer",
                   reject_report_answer("1.1"));
            });

            describe("when displaying the total enrollment", function() {
                beforeEach(function() {
                    report_name = "enrollment_total";
                    tester.setup.user.answers({
                        'states:report:enrollment_male': 5,
                        'states:report:enrollment_female': 8
                    });
                });

                it("should display state correctly",
                   display_state_correctly([
                       "Total enrollment: 13",
                       "1. Continue"
                   ].join("\n"))
                );
            });

            describe("when answering attendance_male", function() {
                beforeEach(function() {
                    report_name = "attendance_male";
                    tester.setup.user.answers({
                        'states:report:enrollment_male': 5,
                    });
                });

                it("should display state correctly",
                   display_state_correctly("Male attendance (highest):")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 5 as an answer",
                   accept_report_answer("5", 5));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 6 as an answer",
                   reject_report_answer("6"));

                it("should reject 1.1 as an answer",
                   reject_report_answer("1.1"));
            });

            describe("when answering attendance_female", function() {
                beforeEach(function() {
                    report_name = "attendance_female";
                    tester.setup.user.answers({
                        'states:report:enrollment_female': 5,
                    });
                });

                it("should display state correctly",
                   display_state_correctly("Female attendance (highest):")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 5 as an answer",
                   accept_report_answer("5", 5));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 6 as an answer",
                   reject_report_answer("6"));

                it("should reject 1.1 as an answer",
                   reject_report_answer("1.1"));
            });

            describe("when displaying the total attendance", function() {
                beforeEach(function() {
                    report_name = "attendance_total";
                    tester.setup.user.answers({
                        'states:report:attendance_male': 5,
                        'states:report:attendance_female': 8
                    });
                });

                it("should display state correctly",
                   display_state_correctly([
                       "Total attendance: 13",
                       "1. Continue"
                   ].join("\n"))
                );
            });

            describe("when answering beneficiaries_male", function() {
                beforeEach(function() {
                    report_name = "beneficiaries_male";
                    tester.setup.user.answers({
                        'states:report:attendance_male': 5,
                    });
                });

                it("should display state correctly",
                   display_state_correctly("Male beneficiaries (highest):")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 5 as an answer",
                   accept_report_answer("5", 5));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 6 as an answer",
                   reject_report_answer("6"));

                it("should reject 1.1 as an answer",
                   reject_report_answer("1.1"));
            });

            describe("when answering beneficiaries_female", function() {
                beforeEach(function() {
                    report_name = "beneficiaries_female";
                    tester.setup.user.answers({
                        'states:report:attendance_female': 5,
                    });
                });

                it("should display state correctly",
                   display_state_correctly("Female beneficiaries (highest):")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 5 as an answer",
                   accept_report_answer("5", 5));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 6 as an answer",
                   reject_report_answer("6"));

                it("should reject 1.1 as an answer",
                   reject_report_answer("1.1"));
            });

            describe("when displaying the total beneficiaries", function() {
                beforeEach(function() {
                    report_name = "beneficiaries_total";
                    tester.setup.user.answers({
                        'states:report:beneficiaries_male': 5,
                        'states:report:beneficiaries_female': 8
                    });
                });

                it("should display state correctly",
                   display_state_correctly([
                       "Total beneficiaries: 13",
                       "1. Continue"
                   ].join("\n"))
                );
            });

            describe("when answering not_fed:lack_of_food", function() {
                beforeEach(function() {
                    report_name = "not_fed:lack_of_food";
                    tester.setup.user.answers({
                        'states:report:days_in_session': 7,
                        'states:report:days_of_feeding': 3,
                    });
                });

                it("should display state correctly",
                   display_state_correctly("Number of days pupils not fed for - Lack of food:")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 4 as an answer",
                   accept_report_answer("4", 4));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 5 as an answer",
                   reject_report_answer("5"));

                it("should reject 1.1 as an answer",
                   reject_report_answer("1.1"));
            });

            describe("when answering not_fed:lack_of_firewood", function() {
                beforeEach(function() {
                    report_name = "not_fed:lack_of_firewood";
                    tester.setup.user.answers({
                        'states:report:days_in_session': 7,
                        'states:report:days_of_feeding': 3,
                    });
                });

                it("should display state correctly",
                   display_state_correctly("Number of days pupils not fed for - Lack of firewood:")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 4 as an answer",
                   accept_report_answer("4", 4));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 5 as an answer",
                   reject_report_answer("5"));

                it("should reject 1.1 as an answer",
                   reject_report_answer("1.1"));
            });

            describe("when answering not_fed:lack_of_water", function() {
                beforeEach(function() {
                    report_name = "not_fed:lack_of_water";
                    tester.setup.user.answers({
                        'states:report:days_in_session': 7,
                        'states:report:days_of_feeding': 3,
                    });
                });

                it("should display state correctly",
                   display_state_correctly("Number of days pupils not fed for - Lack of water:")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 4 as an answer",
                   accept_report_answer("4", 4));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 5 as an answer",
                   reject_report_answer("5"));

                it("should reject 1.1 as an answer",
                   reject_report_answer("1.1"));
            });

            describe("when answering not_fed:cooks_absent", function() {
                beforeEach(function() {
                    report_name = "not_fed:cooks_absent";
                    tester.setup.user.answers({
                        'states:report:days_in_session': 7,
                        'states:report:days_of_feeding': 3,
                    });
                });

                it("should display state correctly",
                   display_state_correctly("Number of days pupils not fed for - Cooks absent:")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 4 as an answer",
                   accept_report_answer("4", 4));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 5 as an answer",
                   reject_report_answer("5"));

                it("should reject 1.1 as an answer",
                   reject_report_answer("1.1"));
            });

            describe("when answering not_fed:pupils_dislike_food", function() {
                beforeEach(function() {
                    report_name = "not_fed:pupils_dislike_food";
                    tester.setup.user.answers({
                        'states:report:days_in_session': 7,
                        'states:report:days_of_feeding': 3,
                    });
                });

                it("should display state correctly",
                   display_state_correctly("Number of days pupils not fed for - Pupils dislike food:")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 4 as an answer",
                   accept_report_answer("4", 4));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 5 as an answer",
                   reject_report_answer("5"));

                it("should reject 1.1 as an answer",
                   reject_report_answer("1.1"));
            });

            describe("when answering not_fed:other", function() {
                beforeEach(function() {
                    report_name = "not_fed:other";
                    tester.setup.user.answers({
                        'states:report:days_in_session': 7,
                        'states:report:days_of_feeding': 3,
                    });
                });

                it("should display state correctly",
                   display_state_correctly("Number of days pupils not fed for - Other:")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 4 as an answer",
                   accept_report_answer("4", 4));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 5 as an answer",
                   reject_report_answer("5"));

                it("should reject 1.1 as an answer",
                   reject_report_answer("1.1"));
            });

            describe("when answering cereal:received", function() {
                beforeEach(function() {
                    report_name = "cereal:received";
                });

                it("should display state correctly",
                   display_state_correctly("Cereal received (kg):")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 20000 as an answer",
                   accept_report_answer("20000", 20000));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 20001 as an answer",
                   reject_report_answer("20001"));

                it("should accept 1.1 as an answer",
                   accept_report_answer("1.1", 1.1));
            });

            describe("when answering cereal:used", function() {
                beforeEach(function() {
                    report_name = "cereal:used";
                });

                it("should display state correctly",
                   display_state_correctly("Cereal used (kg):")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 20000 as an answer",
                   accept_report_answer("20000", 20000));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 20001 as an answer",
                   reject_report_answer("20001"));

                it("should accept 1.1 as an answer",
                   accept_report_answer("1.1", 1.1));
            });

            describe("when answering cereal:losses", function() {
                beforeEach(function() {
                    report_name = "cereal:losses";
                });

                it("should display state correctly",
                   display_state_correctly("Cereal lost (kg):")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 20000 as an answer",
                   accept_report_answer("20000", 20000));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 20001 as an answer",
                   reject_report_answer("20001"));

                it("should accept 1.1 as an answer",
                   accept_report_answer("1.1", 1.1));
            });

            describe("when answering pulses:received", function() {
                beforeEach(function() {
                    report_name = "pulses:received";
                });

                it("should display state correctly",
                   display_state_correctly("Pulses received (kg):")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 20000 as an answer",
                   accept_report_answer("20000", 20000));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 20001 as an answer",
                   reject_report_answer("20001"));

                it("should accept 1.1 as an answer",
                   accept_report_answer("1.1", 1.1));
            });

            describe("when answering pulses:used", function() {
                beforeEach(function() {
                    report_name = "pulses:used";
                });

                it("should display state correctly",
                   display_state_correctly("Pulses used (kg):")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 20000 as an answer",
                   accept_report_answer("20000", 20000));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 20001 as an answer",
                   reject_report_answer("20001"));

                it("should accept 1.1 as an answer",
                   accept_report_answer("1.1", 1.1));
            });

            describe("when answering pulses:losses", function() {
                beforeEach(function() {
                    report_name = "pulses:losses";
                });

                it("should display state correctly",
                   display_state_correctly("Pulses lost (kg):")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 20000 as an answer",
                   accept_report_answer("20000", 20000));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 20001 as an answer",
                   reject_report_answer("20001"));

                it("should accept 1.1 as an answer",
                   accept_report_answer("1.1", 1.1));
            });

            describe("when answering oil:received", function() {
                beforeEach(function() {
                    report_name = "oil:received";
                });

                it("should display state correctly",
                   display_state_correctly("Oil received (kg):")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 20000 as an answer",
                   accept_report_answer("20000", 20000));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 20001 as an answer",
                   reject_report_answer("20001"));

                it("should accept 1.1 as an answer",
                   accept_report_answer("1.1", 1.1));
            });

            describe("when answering oil:used", function() {
                beforeEach(function() {
                    report_name = "oil:used";
                });

                it("should display state correctly",
                   display_state_correctly("Oil used (kg):")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 20000 as an answer",
                   accept_report_answer("20000", 20000));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 20001 as an answer",
                   reject_report_answer("20001"));

                it("should accept 1.1 as an answer",
                   accept_report_answer("1.1", 1.1));
            });

            describe("when answering oil:losses", function() {
                beforeEach(function() {
                    report_name = "oil:losses";
                });

                it("should display state correctly",
                   display_state_correctly("Oil lost (kg):")
                );

                it("should accept 0 as an answer",
                   accept_report_answer("0", 0));

                it("should accept 20000 as an answer",
                   accept_report_answer("20000", 20000));

                it("should reject -1 as an answer",
                   reject_report_answer("-1"));

                it("should reject 20001 as an answer",
                   reject_report_answer("20001"));

                it("should accept 1.1 as an answer",
                   accept_report_answer("1.1", 1.1));
            });

            describe("when completing the report", function() {
                it("should display the report end state", function () {
                    return tester
                        .setup.user.state("states:report:oil:losses")
                        .input("10")
                        .check.interaction({
                            state: "states:report:end",
                            reply: "Thanks for the report!",
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });
        });
    });
});
