var assert = require('assert');
var _ = require("lodash");
var vumigo = require('vumigo_v02');
var fixtures = require('./fixtures');
var AppTester = vumigo.AppTester;
var Extendable = vumigo.utils.Extendable;

var SequentialStatesHelper = Extendable.extend(function(self) {
    self.seq_states = null;
    self.tester = null;
    self.state_suffix = null;

    self.init = {};

    self.init.states = function(seq_states) {
        self.seq_states = seq_states;
        return self;
    };

    self.init.tester = function(tester) {
        self.tester = tester;
        return self;
    };

    self.init.state = function(state_suffix) {
        self.state_suffix = state_suffix;
        return self;
    };

    self.display_correctly = function(reply) {
        return function() {
            var state_name = self.seq_states.prefix + self.state_suffix;
            var expected_answers;
            return self.tester
                .setup.user(function (user) {
                    expected_answers = _(user.answers || {}).clone();
                    return user;
                })
                .setup.user.state(state_name)
                .input({content: null, session_event: 'resume'})
                .check.reply(reply)
                .check.user(function (user) {
                    assert.deepEqual(user.answers, expected_answers);
                })
                .check.user.state(state_name)
                .run();
        };
    };

    self.accept_answer = function(content, answer) {
        return function() {
            var state_name = self.seq_states.prefix + self.state_suffix;
            var expected_answers;
            return self.tester
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
                    var next_state = self.seq_states.next(state_name);
                    assert.equal(im.user.state.name, next_state);
                })
                .run();
        };
    };

    self.reject_answer = function(content) {
        return function() {
            var state_name = self.seq_states.prefix + self.state_suffix;
            var expected_answers;
            return self.tester
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
    };
});


function setup_registered_user(tester) {
    return tester
        .setup.user.addr('+1234')
        .setup(function (api) {
            api.contacts.add({
                msisdn: '+1234',
                extra: {
                    registered_for_wfp: 'true',
                }
            });
        });
}


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
                    fixtures.http().forEach(api.http.fixtures.add);
                });
        });

        describe("when an unregistered user starts a session", function() {
            it("should show them the start menu", function() {
                return tester
                    .start()
                    .check.interaction({
                        state: 'states:start',
                        reply: [
                            'Welcome to the Home Grown School Feeding Program.',
                            '1. Register',
                            '2. Exit'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when a registered user starts a session", function() {
            beforeEach(function() {
                setup_registered_user(tester);
            });

            it("should show them the start menu", function() {
                return tester
                    .setup.user({
                        addr: '+1234',
                    })
                    .setup(function (api) {
                        api.contacts.add({
                            msisdn: '+1234',
                            extra: {
                                registered_for_wfp: 'true',
                            }
                        });
                    })
                    .start()
                    .check.interaction({
                        state: 'states:start',
                        reply: [
                            'Welcome to the Home Grown School Feeding Program.',
                            '1. Report',
                            '2. Exit'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when a user starts a session in non-start state", function() {
            beforeEach(function() {
                tester.setup.user.state('states:register');
            });

            it("should show them the restart menu", function() {
                return tester
                    .start()
                    .check.interaction({
                        state: {
                            name: '__restart__',
                            creator_opts: {
                                prev_state_name: 'states:register',
                                prev_state_opts: {},
                            },
                            metadata: {
                            },
                        },
                        reply: [
                            'Welcome back to the Home Grown School Feeding' +
                            ' Program. Do you want to:',
                            '1. Continue from where you were',
                            '2. Restart from the beginning'
                        ].join('\n')
                    })
                    .run();
            });
        });

        describe("when an unregistered user is at the start menu", function() {
            describe("when the user selects registration", function() {
                it("should show the first registration question", function() {
                    return tester
                        .setup.user.state('states:start')
                        .input('1')
                        .check.interaction({
                            state: 'states:register:school_id',
                            reply: 'School ID:',
                        })
                        .run();
                });
            });

            describe("when the user asks to exit", function() {
                it("should say thank you and end the session", function() {
                    return tester
                        .setup.user.state('states:start')
                        .input('2')
                        .check.interaction({
                            state: 'states:end',
                            reply: 'Bye!'
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });
        });

        describe("when a registered user is at the start menu", function() {
            beforeEach(function() {
                setup_registered_user(tester);
            });

            describe("when the user selects reporting", function() {
                it("should show the first reporting question", function() {
                    return tester
                        .setup.user.state('states:start')
                        .input('1')
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
                        .input('2')
                        .check.interaction({
                            state: 'states:end',
                            reply: 'Bye!'
                        })
                        .check.reply.ends_session()
                        .run();
                });
            });
        });

        describe("when a user is in the __restart__ state", function() {
            beforeEach(function() {
                tester.setup.user.state({
                    name: '__restart__',
                    creator_opts: {
                        prev_state_name: 'states:register:school_id',
                        prev_state_opts: {
                            droids: "you are looking for",
                        },
                    },
                });
            });

            it("should resume if they select continue", function() {
                return tester
                    .input('1')
                    .check.interaction({
                        state: {
                            name: 'states:register:school_id',
                            creator_opts: {
                                droids: "you are looking for",
                            },
                            metadata: {
                            },
                        },
                        reply: [
                            'School ID:'
                        ].join('\n')
                    })
                    .run();
            });

            it("should return to the start menu if they select restart",
            function() {
                return tester
                    .input('2')
                    .check.interaction({
                        state: {
                            name: 'states:start',
                            creator_opts: {},
                            metadata: {},
                        },
                        reply: [
                            'Welcome to the Home Grown School Feeding Program.',
                            '1. Register',
                            '2. Exit',
                        ].join('\n')
                    })
                    .run();
            });
        });

        function number_answer_tests(min, max, is_float) {
            var float_in_range = (((min + max) / 2) + 0.1);
            var common = [
                {name: "should accept " + min + " as an answer", accept: true, input: '' + min, expected: min},
                {name: "should accept " + max + " as an answer", accept: true, input: '' + max, expected: max},
                {name: "should reject " + (min-1) + " as an answer", accept: false, input: '' + (min-1)},
                {name: "should reject " + (max+1) + " as an answer", accept: false, input: '' + (max+1)},
                {name: "should reject FOO as an answer", accept: false, input: 'FOO'},
                {name: "should reject 123FOO as an answer", accept: false, input: '123FOO'},
            ];

            if (is_float) {
                return common.concat([{
                    name: "should accept " + float_in_range + " as an answer",
                    accept: true,
                    input: ''+ float_in_range,
                    expected: float_in_range
                }]);
            } else {
                return common.concat([{
                    name: "should reject " + float_in_range + " as an answer",
                    accept: false,
                    input: ''+ float_in_range
                }]);
            }
        }

        function apply_answer_tests(states_helper, tests) {
            tests.forEach(function (answerTest) {
                if (answerTest.accept) {
                    it(answerTest.name, states_helper.accept_answer(answerTest.input, answerTest.expected));
                } else {
                    it(answerTest.name, states_helper.reject_answer(answerTest.input));
                }
            });
        }

        describe("when registering a school", function() {
            var states_helper = new SequentialStatesHelper();

            beforeEach(function() {
                states_helper
                    .init.states(app.reg_states)
                    .init.tester(tester);
            });

            describe("when answering school_id", function() {
                beforeEach(function() {
                    states_helper.init.state("school_id");
                });

                it("should display state correctly",
                   states_helper.display_correctly("School ID:"));

                it("should accept 12345 as an answer",
                   states_helper.accept_answer("12345", "12345"));
            });

            describe("when answering emis", function() {
                beforeEach(function() {
                    states_helper.init.state("emis");
                });

                it("should display state correctly",
                   states_helper.display_correctly("EMIS:"));

                it("should accept 12345 as an answer",
                   states_helper.accept_answer("12345", "12345"));

                it("should reject 123abc as an answer",
                   states_helper.reject_answer("123abc"));
            });

            describe("when answering cereal:opening", function() {
                beforeEach(function() {
                    states_helper.init.state("cereal:opening");
                });

                it("should display state correctly",
                   states_helper.display_correctly("Cereal opening (kg):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 20000, true));
            });

            describe("when answering pulses:opening", function() {
                beforeEach(function() {
                    states_helper.init.state("pulses:opening");
                });

                it("should display state correctly",
                   states_helper.display_correctly("Pulses opening (kg):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 20000, true));
            });

            describe("when answering oil:opening", function() {
                beforeEach(function() {
                    states_helper.init.state("oil:opening");
                });

                apply_answer_tests(states_helper, number_answer_tests(0, 20000, true));
            });

            describe("when completing registration", function() {
                beforeEach(function() {
                    tester
                        .setup.user.state("states:register:oil:opening")
                        .setup.user.answers(fixtures.answers().registration);
                });

                it("should display the registration end state", function () {
                    return tester
                        .input("10")
                        .check.interaction({
                            state: "states:register:end",
                            reply: "Thanks for registering!",
                        })
                        .check.reply.ends_session()
                        .run();
                });

                it("should log balances if using a dummy API", function () {
                    return tester
                        .input("10")
                        .check(function(api, im, app) {
                            assert.strictEqual(_.last(api.log.info), [
                                "Dummy CommCareApi call: sender=+27123456789,",
                                " message='set SCHOOL123 emisEMIS456",
                                " cer-o12.5 pul-o14 oil-o10'",
                            ].join(""));
                        })
                        .run();
                });

                it("should send the balances if using a real API", function () {
                    return tester
                        .setup.config.app({
                            commcare_api: "http://example.com/commcare/api/",
                        })
                        .input("10")
                        .check(function(api, im, app) {
                            assert.strictEqual(_.last(api.log.info), [
                                "CommCareApi call:",
                                " code=200, body=\"OK\", sender=+27123456789,",
                                " message='set SCHOOL123 emisEMIS456",
                                " cer-o12.5 pul-o14 oil-o10",
                                "'",
                            ].join(""));
                        })
                        .run();
                });

                it("should mark the contact as registered", function() {
                    return tester
                        .input("10")
                        .check(function(api, im, app) {
                            var contacts = _.where(api.contacts.store,
                                                   {msisdn: "+27123456789"});
                            assert.equal(contacts.length, 1);
                            assert.deepEqual(contacts[0].extra, {
                                registered_for_wfp: "true",
                            });
                        })
                        .run();
                });
            });
        });

        describe("when the user is filing a report", function() {
            var states_helper = new SequentialStatesHelper();

            beforeEach(function() {
                states_helper
                    .init.states(app.report_states)
                    .init.tester(tester);
            });

            describe("when answering school_id", function() {
                beforeEach(function() {
                    states_helper.init.state("school_id");
                });

                it("should display state correctly",
                   states_helper.display_correctly("School ID:"));

                it("should accept 12345 as an answer",
                   states_helper.accept_answer("12345", "12345"));
            });

            describe("when answering days_in_session", function() {
                beforeEach(function() {
                    states_helper.init.state("days_in_session");
                });

                it("should display state correctly",
                   states_helper.display_correctly("Number of school days in session:")
                );

                apply_answer_tests(states_helper, number_answer_tests(1, 31, false));
            });

            describe("when answering days_of_feeding", function() {
                beforeEach(function() {
                    states_helper.init.state("days_of_feeding");
                    tester.setup.user.answers({
                        'states:report:days_in_session': "5"
                    });
                });

                it("should display state correctly",
                   states_helper.display_correctly("Number of days food served:")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 5, false));
            });

            describe("when answering enrollment_male", function() {
                beforeEach(function() {
                    states_helper.init.state("enrollment_male");
                });

                it("should display state correctly",
                   states_helper.display_correctly("Male enrollment:")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 10000, false));
            });

            describe("when answering enrollment_female", function() {
                beforeEach(function() {
                    states_helper.init.state("enrollment_female");
                });

                it("should display state correctly",
                   states_helper.display_correctly("Female enrollment:")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 10000, false));
            });

            describe("when displaying the total enrollment", function() {
                beforeEach(function() {
                    states_helper.init.state("enrollment_total");
                    tester.setup.user.answers({
                        'states:report:enrollment_male': "5",
                        'states:report:enrollment_female': "8"
                    });
                });

                it("should display state correctly",
                   states_helper.display_correctly([
                       "Total enrollment: 13",
                       "1. Continue"
                   ].join("\n"))
                );
            });

            describe("when answering attendance_male", function() {
                beforeEach(function() {
                    states_helper.init.state("attendance_male");
                    tester.setup.user.answers({
                        'states:report:enrollment_male': "5",
                    });
                });

                it("should display state correctly",
                   states_helper.display_correctly("Male attendance (highest):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 5, false));
            });

            describe("when answering attendance_female", function() {
                beforeEach(function() {
                    states_helper.init.state("attendance_female");
                    tester.setup.user.answers({
                        'states:report:enrollment_female': "5",
                    });
                });

                it("should display state correctly",
                   states_helper.display_correctly("Female attendance (highest):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 5, false));
            });

            describe("when displaying the total attendance", function() {
                beforeEach(function() {
                    states_helper.init.state("attendance_total");
                    tester.setup.user.answers({
                        'states:report:attendance_male': "5",
                        'states:report:attendance_female': "8"
                    });
                });

                it("should display state correctly",
                   states_helper.display_correctly([
                       "Total attendance: 13",
                       "1. Continue"
                   ].join("\n"))
                );
            });

            describe("when answering beneficiaries_male", function() {
                beforeEach(function() {
                    states_helper.init.state("beneficiaries_male");
                    tester.setup.user.answers({
                        'states:report:attendance_male': "5",
                    });
                });

                it("should display state correctly",
                   states_helper.display_correctly("Male beneficiaries (highest):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 5, false));
            });

            describe("when answering beneficiaries_female", function() {
                beforeEach(function() {
                    states_helper.init.state("beneficiaries_female");
                    tester.setup.user.answers({
                        'states:report:attendance_female': "5",
                    });
                });

                it("should display state correctly",
                   states_helper.display_correctly("Female beneficiaries (highest):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 5, false));
            });

            describe("when displaying the total beneficiaries", function() {
                beforeEach(function() {
                    states_helper.init.state("beneficiaries_total");
                    tester.setup.user.answers({
                        'states:report:beneficiaries_male': "5",
                        'states:report:beneficiaries_female': "8"
                    });
                });

                it("should display state correctly",
                   states_helper.display_correctly([
                       "Total beneficiaries: 13",
                       "1. Continue"
                   ].join("\n"))
                );
            });

            describe("when answering not_fed:lack_of_food", function() {
                beforeEach(function() {
                    states_helper.init.state("not_fed:lack_of_food");
                    tester.setup.user.answers({
                        'states:report:days_in_session': "7",
                        'states:report:days_of_feeding': "3",
                    });
                });

                it("should display state correctly",
                   states_helper.display_correctly("Number of days pupils not fed for - Lack of food:")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 4, false));
            });

            describe("when answering not_fed:lack_of_firewood", function() {
                beforeEach(function() {
                    states_helper.init.state("not_fed:lack_of_firewood");
                    tester.setup.user.answers({
                        'states:report:days_in_session': "7",
                        'states:report:days_of_feeding': "3",
                    });
                });

                it("should display state correctly",
                   states_helper.display_correctly("Number of days pupils not fed for - Lack of firewood:")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 4, false));
            });

            describe("when answering not_fed:lack_of_water", function() {
                beforeEach(function() {
                    states_helper.init.state("not_fed:lack_of_water");
                    tester.setup.user.answers({
                        'states:report:days_in_session': "7",
                        'states:report:days_of_feeding': "3",
                    });
                });

                it("should display state correctly",
                   states_helper.display_correctly("Number of days pupils not fed for - Lack of water:")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 4, false));
            });

            describe("when answering not_fed:cooks_absent", function() {
                beforeEach(function() {
                    states_helper.init.state("not_fed:cooks_absent");
                    tester.setup.user.answers({
                        'states:report:days_in_session': "7",
                        'states:report:days_of_feeding': "3",
                    });
                });

                it("should display state correctly",
                   states_helper.display_correctly("Number of days pupils not fed for - Cooks absent:")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 4, false));
            });

            describe("when answering not_fed:pupils_dislike_food", function() {
                beforeEach(function() {
                    states_helper.init.state("not_fed:pupils_dislike_food");
                    tester.setup.user.answers({
                        'states:report:days_in_session': "7",
                        'states:report:days_of_feeding': "3",
                    });
                });

                it("should display state correctly",
                   states_helper.display_correctly("Number of days pupils not fed for - Pupils dislike food:")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 4, false));
            });

            describe("when answering not_fed:other", function() {
                beforeEach(function() {
                    states_helper.init.state("not_fed:other");
                    tester.setup.user.answers({
                        'states:report:days_in_session': "7",
                        'states:report:days_of_feeding': "3",
                    });
                });

                it("should display state correctly",
                   states_helper.display_correctly("Number of days pupils not fed for - Other:")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 4, false));
            });

            describe("when answering cereal:received", function() {
                beforeEach(function() {
                    states_helper.init.state("cereal:received");
                });

                it("should display state correctly",
                   states_helper.display_correctly("Cereal received (kg):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 20000, true));
            });

            describe("when answering cereal:used", function() {
                beforeEach(function() {
                    states_helper.init.state("cereal:used");
                });

                it("should display state correctly",
                   states_helper.display_correctly("Cereal used (kg):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 20000, true));
            });

            describe("when answering cereal:losses", function() {
                beforeEach(function() {
                    states_helper.init.state("cereal:losses");
                });

                it("should display state correctly",
                   states_helper.display_correctly("Cereal lost (kg):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 20000, true));
            });

            describe("when answering pulses:received", function() {
                beforeEach(function() {
                    states_helper.init.state("pulses:received");
                });

                it("should display state correctly",
                   states_helper.display_correctly("Pulses received (kg):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 20000, true));
            });

            describe("when answering pulses:used", function() {
                beforeEach(function() {
                    states_helper.init.state("pulses:used");
                });

                it("should display state correctly",
                   states_helper.display_correctly("Pulses used (kg):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 20000, true));
            });

            describe("when answering pulses:losses", function() {
                beforeEach(function() {
                    states_helper.init.state("pulses:losses");
                });

                it("should display state correctly",
                   states_helper.display_correctly("Pulses lost (kg):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 20000, true));
            });

            describe("when answering oil:received", function() {
                beforeEach(function() {
                    states_helper.init.state("oil:received");
                });

                it("should display state correctly",
                   states_helper.display_correctly("Oil received (kg):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 20000, true));
            });

            describe("when answering oil:used", function() {
                beforeEach(function() {
                    states_helper.init.state("oil:used");
                });

                it("should display state correctly",
                   states_helper.display_correctly("Oil used (kg):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 20000, true));
            });

            describe("when answering oil:losses", function() {
                beforeEach(function() {
                    states_helper.init.state("oil:losses");
                });

                it("should display state correctly",
                   states_helper.display_correctly("Oil lost (kg):")
                );

                apply_answer_tests(states_helper, number_answer_tests(0, 20000, true));
            });

            describe("when completing the report", function() {
                beforeEach(function() {
                    tester
                        .setup.user.state("states:report:oil:losses")
                        .setup.user.answers(fixtures.answers().report);
                });

                it("should display the report end state", function () {
                    return tester
                        .input("10")
                        .check.interaction({
                            state: "states:report:end",
                            reply: "Thanks for the report!",
                        })
                        .check.reply.ends_session()
                        .run();
                });

                it("should log the reports if using a dummy API", function () {
                    return tester
                        .input("302")
                        .check(function(api, im, app) {
                            smses = api.log.info.slice(-1);
                            assert.strictEqual(smses[0], [
                                "Dummy CommCareApi call: sender=+27123456789,",
                                " message='",
                                "hgsfussd SCHOOL123 sch30 fed20",
                                " enr-m100 enr-f150 att-m75 att-f85",
                                " ben-m70 ben-f80",
                                " nofed-a1 nofed-b2 nofed-c3",
                                " nofed-d4 nofed-e5 nofed-f6",
                                " cer-r100 cer-u101 cer-l102",
                                " pul-r200 pul-u201 pul-l202",
                                " oil-r300 oil-u301 oil-l302",
                                "'",
                            ].join(""));
                        })
                        .run();
                });

                it("should send the reports if using a real API", function () {
                    return tester
                        .setup.config.app({
                            commcare_api: "http://example.com/commcare/api/",
                        })
                        .input("302")
                        .check(function(api, im, app) {
                            smses = api.log.info.slice(-1);
                            assert.strictEqual(smses[0], [
                                "CommCareApi call:",
                                " code=200, body=\"OK\", sender=+27123456789,",
                                " message='hgsfussd SCHOOL123 sch30 fed20",
                                " enr-m100 enr-f150 att-m75 att-f85 ben-m70",
                                " ben-f80 nofed-a1 nofed-b2 nofed-c3 nofed-d4",
                                " nofed-e5 nofed-f6 cer-r100 cer-u101",
                                " cer-l102 pul-r200 pul-u201 pul-l202",
                                " oil-r300 oil-u301 oil-l302",
                                "'",
                            ].join(""));
                        })
                        .run();
                });
            });
        });
    });
});
