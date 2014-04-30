var go = {};
go;

go.app = function() {
    var vumigo = require('vumigo_v02');
    var _ = require("lodash");
    var Q = require("q");
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var MenuState = vumigo.states.MenuState;
    var FreeText = vumigo.states.FreeText;
    var EndState = vumigo.states.EndState;
    var LazyTranslator = vumigo.translate.LazyTranslator;
    var HttpApi = vumigo.http.api.HttpApi;
    var Extendable = vumigo.utils.Extendable;

    var $ = new LazyTranslator();

    var FloatState = FreeText.extend(function(self, name, opts) {
        opts = _.defaults(opts || {});
        self.additional_check = opts.check;
        FreeText.call(self, name, opts);

        self.check = function(input) {
            var x = parseFloat(input);
            if (_.isNaN(x) || !input.match(/^[\d]+(\.[\d]+)?$/)) {
                return $("Expected a number.");
            }
            return self.additional_check(x);
        };
    });

    var IntegerState = FreeText.extend(function(self, name, opts) {
        opts = _.defaults(opts || {});
        self.additional_check = opts.check;
        FreeText.call(self, name, opts);

        self.check = function(input) {
            var x = parseFloat(input);
            if (_.isNaN(x) || (x % 1 !== 0) || !input.match(/^[\d]+$/)) {
                return $("Expected a whole number.");
            }
            return self.additional_check(x);
        };
    });

    var SequentialStates = Extendable.extend(function (self, app, prefix) {
        self.app = app;
        self.prefix = prefix;
        self.states = [];

        self.add = function(suffix, creator) {
            var name =  self.prefix + suffix;
            self.states.push(name);
            return self.app.states.add(name, creator);
        };

        self.first = function() {
            return self.states[0];
        };

        self.next = function(name) {
            var idx = _(self.states).indexOf(name);
            idx = idx < self.states.length ? idx : 0;
            return self.states[idx + 1];
        };

        self.answer = function(user, suffix) {
            return user.answers[self.prefix + suffix];
        };
    });

    var CommCareApi = HttpApi.extend(function(self, im, api_url) {
        self.api_url = api_url;

        HttpApi.call(self, im);

        self.call_api = function(sender, message) {
            return self.get(self.api_url, {
                params: {
                    sender: sender,
                    message: message
                }
            }).then(function(result) {
                return self.im.log([
                    "CommCareApi call:",
                    " code=", result.code,
                    ", body=", result.body,
                    ", sender=", sender,
                    ", message='", message, "'"
                ].join("")).thenResolve(result);
            });
        };

        self.make_template = function(answer_pairs) {
            return _.template(
                _.map(answer_pairs, function(pair) {
                    return pair[0] + "<%= answer('" + pair[1] + "') %>";
                }).join(" ")
            );
        };

        self.set_opening_balances = function(user, seq_states) {
            var template = self.make_template([
                ["set ", "school_id"],
                ["emis", "emis"],
                ["cer-o", "cereal:opening"],
                ["pul-o", "pulses:opening"],
                ["oil-o", "oil:opening"]
            ]);
            var message = template({
                answer: _.partial(seq_states.answer, user)
            });
            return self.call_api(user.addr, message);
        };

        self.send_monthly_sms = function(user, seq_states) {
            var template = self.make_template([
                ["hgsfussd ", "school_id"],
                ["sch", "days_in_session"], ["fed", "days_of_feeding"],
                ["enr-m", "enrollment_male"], ["enr-f", "enrollment_female"],
                ["att-m", "attendance_male"], ["att-f", "attendance_female"],
                ["ben-m", "beneficiaries_male"],
                ["ben-f", "beneficiaries_female"],
                ["nofed-a", "not_fed:lack_of_food"],
                ["nofed-b", "not_fed:lack_of_firewood"],
                ["nofed-c", "not_fed:lack_of_water"],
                ["nofed-d", "not_fed:cooks_absent"],
                ["nofed-e", "not_fed:pupils_dislike_food"],
                ["nofed-f", "not_fed:other"],
                ["cer-r", "cereal:received"], ["cer-u", "cereal:used"],
                ["cer-l", "cereal:losses"],
                ["pul-r", "pulses:received"], ["pul-u", "pulses:used"],
                ["pul-l", "pulses:losses"],
                ["oil-r", "oil:received"], ["oil-u", "oil:used"],
                ["oil-l", "oil:losses"]
            ]);
            var message = template({
                answer: _.partial(seq_states.answer, user)
            });
            return self.call_api(user.addr, message);
        };
    });

    var DummyCommCareApi = CommCareApi.extend(function(self, im) {
        CommCareApi.call(self, im, null);

        self.call_api = function(sender, message) {
            return self.im.log([
                "Dummy CommCareApi call: sender=", sender,
                ", message='", message, "'"].join(""));
        };
    });

    var GoApp = App.extend(function(self) {
        App.call(self, 'states:start');

        self.contact = null;

        self.init = function() {
            if (!self.im.config.commcare_api) {
                self.commcare = new DummyCommCareApi(self.im);
            }
            else {
                self.commcare = new CommCareApi(
                    self.im,
                    self.im.config.commcare_api);
            }
            return self.im.contacts.for_user()
                .then(function(contact) {
                    self.contact = contact;
                });
        };

        // Utilities

        self.check_int = function(min, max) {
            return function(i) {
                if (_.isString(min)) {
                    min = self.im.user.answers['states:report:' + min];
                }
                else if (_.isFunction(min)) {
                    min = min.call(self, self.im.user);
                }
                if (_.isString(max)) {
                    max = self.im.user.answers['states:report:' + max];
                }
                else if (_.isFunction(max)) {
                    max = max.call(self, self.im.user);
                }
                if ((i < min) || (i > max)) {
                    return $("Number must be between {{ min }} and {{ max }}.")
                        .context({min: min, max: max});
                }
            };
        };

        // Start

        self.states.add('states:start', function(name) {
            var choices = [];

            if (self.contact.extra.registered_for_wfp !== 'true') {
                choices.push(new Choice('states:register', $('Register')));
            }
            else {
                choices.push(new Choice('states:report', $('Report')));
            }
            choices.push(new Choice('states:end', $('Exit')));

            return new MenuState(name, {
                question: $('Welcome to the World Feed Program.'),
                choices: choices
            });
        });

        // Registration utilities

        self.reg_states = new SequentialStates(self, 'states:register:');

        self.add_reg_question = function(reg_name, opts) {
            opts = _.defaults(opts || {}, {
                state: IntegerState
            });
            self.reg_states.add(reg_name, function(name) {
                return new opts.state(name, {
                    question: opts.question,
                    check: opts.check,
                    next: self.reg_states.next(name)
                });
            });
        };

        self.add_reg_goods_question = function(reg_name, opts) {
            opts = _.defaults(opts || {}, {
                state: FloatState,
                check: self.check_int(0, 20000)
            });
            return self.add_reg_question(reg_name, opts);
        };

        // Registration

        self.states.add('states:register', function(name) {
            return self.states.create(self.reg_states.first());
        });

        self.add_reg_question('school_id', {
            state: FreeText,
            question: $('School ID:')
        });

        self.add_reg_question('emis', {
            state: IntegerState,
            question: $('EMIS:'),
            check: function(i) {}
        });

        self.add_reg_goods_question('cereal:opening', {
            question: $('Cereal opening (kg):'),
        });

        self.add_reg_goods_question('pulses:opening', {
            question: $('Pulses opening (kg):'),
        });

        self.add_reg_goods_question('oil:opening', {
            question: $('Oil opening (kg):'),
        });

        self.reg_states.add('end', function(name) {
            return new EndState(name, {
                text: $("Thanks for registering!"),
                next: 'states:start',
                events: {
                    // TODO: This should ideally be 'state:enter', but there
                    // is a suspected bug in vumigo_v02 currently:
                    // https://github.com/praekelt/vumi-jssandbox-toolkit/issues/177
                    'state:show': function (state) {
                        self.contact.extra.registered_for_wfp = 'true';
                        return Q.all([
                            self.commcare.set_opening_balances(
                                self.im.user, self.reg_states),
                            self.im.contacts.save(self.contact)
                        ]);
                    }
                }
            });
        });

        // Report utilities

        self.report_states = new SequentialStates(self, 'states:report:');

        self.add_report_question = function(report_name, opts) {
            opts = _.defaults(opts || {}, {
                state: IntegerState
            });
            self.report_states.add(report_name, function(name) {
                return new opts.state(name, {
                    question: opts.question,
                    check: opts.check,
                    next: self.report_states.next(name)
                });
            });
        };

        self.add_report_goods_question = function(report_name, opts) {
            opts = _.defaults(opts || {}, {
                state: FloatState,
                check: self.check_int(0, 20000)
            });
            return self.add_report_question(report_name, opts);
        };

        self.add_report_total = function(total_name, opts) {
            opts = _.defaults(opts || {}, {
                values: []
            });
            self.report_states.add(total_name, function(name) {
                var total = _(opts.values)
                    .map(function (value) {
                        return parseFloat(self.im.user.answers['states:report:' + value]);
                    })
                    .reduce(function (sum, n) { return sum + n; }, 0);
                return new ChoiceState(name, {
                    question: opts.question.context({total: total}),
                    choices: [
                        new Choice("continue", "Continue")
                    ],
                    next: self.report_states.next(name)
                });
            });
        };

        // Report states

        self.states.add('states:report', function(name) {
            return self.states.create(self.report_states.first());
        });

        self.add_report_question('school_id', {
            state: FreeText,
            question: $('School ID:')
        });

        self.add_report_question('days_in_session', {
            question: $('Number of school days in session:'),
            check: self.check_int(1, 31)
        });

        self.add_report_question('days_of_feeding', {
            question: $('Number of days food served:'),
            check: self.check_int(0, 'days_in_session')
        });

        self.add_report_question('enrollment_male', {
            question: $('Male enrollment:'),
            check: self.check_int(0, 10000)
        });

        self.add_report_question('enrollment_female', {
            question: $('Female enrollment:'),
            check: self.check_int(0, 10000)
        });

        self.add_report_total('enrollment_total', {
            question: $('Total enrollment: {{ total }}'),
            values: ['enrollment_male', 'enrollment_female'],
        });

        self.add_report_question('attendance_male', {
            question: $('Male attendance (highest):'),
            check: self.check_int(0, 'enrollment_male')
        });

        self.add_report_question('attendance_female', {
            question: $('Female attendance (highest):'),
            check: self.check_int(0, 'enrollment_female')
        });

        self.add_report_total('attendance_total', {
            question: $('Total attendance: {{ total }}'),
            values: ['attendance_male', 'attendance_female'],
        });

        self.add_report_question('beneficiaries_male', {
            question: $('Male beneficiaries (highest):'),
            check: self.check_int(0, 'attendance_male')
        });

        self.add_report_question('beneficiaries_female', {
            question: $('Female beneficiaries (highest):'),
            check: self.check_int(0, 'attendance_female')
        });

        self.add_report_total('beneficiaries_total', {
            question: $('Total beneficiaries: {{ total }}'),
            values: ['beneficiaries_male', 'beneficiaries_female'],
        });

        self.days_without_feeding = function (user) {
            return (user.answers['states:report:days_in_session'] -
                    user.answers['states:report:days_of_feeding']);
        };

        self.add_report_question('not_fed:lack_of_food', {
            question: $('Number of days pupils not fed for - Lack of food:'),
            check: self.check_int(0, self.days_without_feeding),
        });

        self.add_report_question('not_fed:lack_of_firewood', {
            question: $('Number of days pupils not fed for - Lack of firewood:'),
            check: self.check_int(0, self.days_without_feeding),
        });

        self.add_report_question('not_fed:lack_of_water', {
            question: $('Number of days pupils not fed for - Lack of water:'),
            check: self.check_int(0, self.days_without_feeding),
        });

        self.add_report_question('not_fed:cooks_absent', {
            question: $('Number of days pupils not fed for - Cooks absent:'),
            check: self.check_int(0, self.days_without_feeding),
        });

        self.add_report_question('not_fed:pupils_dislike_food', {
            question: $('Number of days pupils not fed for - Pupils dislike food:'),
            check: self.check_int(0, self.days_without_feeding),
        });

        self.add_report_question('not_fed:other', {
            question: $('Number of days pupils not fed for - Other:'),
            check: self.check_int(0, self.days_without_feeding),
        });

        self.add_report_goods_question('cereal:received', {
            question: $('Cereal received (kg):'),
        });

        self.add_report_goods_question('cereal:used', {
            question: $('Cereal used (kg):'),
        });

        self.add_report_goods_question('cereal:losses', {
            question: $('Cereal lost (kg):'),
        });

        self.add_report_goods_question('pulses:received', {
            question: $('Pulses received (kg):'),
        });

        self.add_report_goods_question('pulses:used', {
            question: $('Pulses used (kg):'),
        });

        self.add_report_goods_question('pulses:losses', {
            question: $('Pulses lost (kg):'),
        });

        self.add_report_goods_question('oil:received', {
            question: $('Oil received (kg):'),
        });

        self.add_report_goods_question('oil:used', {
            question: $('Oil used (kg):'),
        });

        self.add_report_goods_question('oil:losses', {
            question: $('Oil lost (kg):'),
        });

        self.report_states.add('end', function(name) {
            return new EndState(name, {
                text: $("Thanks for the report!"),
                next: 'states:start',
                events: {
                    // TODO: This should ideally be 'state:enter', but there
                    // is a suspected bug in vumigo_v02 currently:
                    // https://github.com/praekelt/vumi-jssandbox-toolkit/issues/177
                    'state:show': function (state) {
                        return self.commcare.send_monthly_sms(
                                self.im.user, self.report_states);
                    }
                }
            });
        });

        // End

        self.states.add('states:end', function(name) {
            return new EndState(name, {
                text: $('Bye!'),
                next: 'states:start',
            });
        });
    });

    return {
        GoApp: GoApp
    };
}();

go.init = function() {
    var vumigo = require('vumigo_v02');
    var InteractionMachine = vumigo.InteractionMachine;
    var GoApp = go.app.GoApp;


    return {
        im: new InteractionMachine(api, new GoApp())
    };
}();
