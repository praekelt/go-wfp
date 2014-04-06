go.app = function() {
    var vumigo = require('vumigo_v02');
    var _ = require("lodash");
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var MenuState = vumigo.states.MenuState;
    var FreeText = vumigo.states.FreeText;
    var EndState = vumigo.states.EndState;
    var LazyTranslator = vumigo.translate.LazyTranslator;

    var $ = new LazyTranslator();

    var FloatState = FreeText.extend(function(self, name, opts) {
        opts = _.defaults(opts || {});
        self.additional_check = opts.check;
        FreeText.call(self, name, opts);

        self.check = function(input) {
            var x = parseFloat(input);
            if (_.isNaN(x)) {
                return App.$("Expected a number.");
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
            if (_.isNaN(x) || (x % 1 !== 0)) {
                return $("Expected a whole number.");
            }
            return self.additional_check(x);
        };
    });

    var GoApp = App.extend(function(self) {
        App.call(self, 'states:start');

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
            return new MenuState(name, {
                question: $('Welcome to the World Feed Program.'),
                choices: [
                    new Choice('states:register', $('Register')),
                    new Choice('states:report', $('Report')),
                    new Choice('states:end', $('Exit'))],
            });
        });

        // Registration

        self.states.add('states:register', function(name) {
            return new EndState(name, {
                text: $('Registration not supported yet.'),
                next: 'states:start',
            });
        });

        // Report utilities

        self.report_states = [];

        self.register_report_state = function(report_name) {
            var name = 'states:report:' + report_name;
            self.report_states.push(name);
            return name;
        };

        self.next_report_state = function(name) {
            var idx = _(self.report_states).indexOf(name);
            return self.report_states[idx + 1];
        };

        self.add_report_question = function(report_name, opts) {
            var name = self.register_report_state(report_name);
            opts = _.defaults(opts || {}, {
                state: IntegerState
            });
            self.states.add(name, function(name) {
                return new opts.state(name, {
                    question: opts.question,
                    check: opts.check,
                    next: self.next_report_state(name)
                });
            });
        };

        self.add_report_goods_question = function(report_name, opts) {
            opts = _.defaults(opts || {
                state: FloatState,
                check: self.check_int(0, 20000)
            });
            return self.add_report_question(report_name, opts);
        };

        self.add_report_total = function(total_name, opts) {
            var name = self.register_report_state(total_name);
            opts = _.defaults(opts || {}, {
                values: []
            });
            self.states.add(name, function(name) {
                var total = _(opts.values)
                    .map(function (value) {
                        return self.im.user.answers['states:report:' + value];
                    })
                    .reduce(function (sum, n) { return sum + n; }, 0);
                return new ChoiceState(name, {
                    question: opts.question.context({total: total}),
                    choices: [
                        new Choice("continue", "Continue")
                    ],
                    next: self.next_report_state(name)
                });
            });
        };

        self.add_report_end = function(report_name) {
            var name = self.register_report_state(report_name);
            self.states.add(name, function(name) {
                return new EndState(name, {
                    text: $("Thanks for the report!"),
                    next: 'states:start',
                });
            });
        };

        // Report states

        self.states.add('states:report', function(name) {
            return self.states.create(self.report_states[0]);
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

        self.add_report_end('end');

        // End

        self.states.add('states:end', function(name) {
            return new EndState(name, {
                text: $('Bye!'),
                next: 'states:start'
            });
        });
    });

    return {
        GoApp: GoApp
    };
}();
