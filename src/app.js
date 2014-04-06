go.app = function() {
    var vumigo = require('vumigo_v02');
    var _ = require("lodash");x
    var App = vumigo.App;
    var Choice = vumigo.states.Choice;
    var ChoiceState = vumigo.states.ChoiceState;
    var MenuState = vumigo.states.MenuState;
    var FreeText = vumigo.states.FreeText;
    var EndState = vumigo.states.EndState;

    var FloatState = FreeText.extend(function(self, name, opts) {
        opts = _.defaults(opts || {});
        self.additional_check = opts.check;
        FreeText.call(self, name, opts);

        self.check = function(input) {
            var x = parseFloat(input);
            if (_.isNaN(x)) {
                return false;
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
                return false;
            }
            return self.additional_check(x);
        };
    });

    var GoApp = App.extend(function(self) {
        App.call(self, 'states:start');

        var $ = self.$;

        // Utilities

        self.check_int = function(min, max) {
            return function(i) {
                if (_.isString(min)) {
                    min = self.im.user.answer('state:report:' + min);
                }
                if (_.isString(max)) {
                    max = self.im.user.answer('state:report:' + max);
                }
                return ((i >= min) && (i <= max));
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
        });

        // Report

        self.states.add('states:report', function(name) {
        });

        self.add_report_question = function(report_name, opts) {
            opts = _.defaults(opts || {}, {
                state: IntegerState
            });
            self.states.add('states:report:' + report_name, function(name) {
                return new opts.state(name, {
                    question: opts.question,
                    check: opts.check,
                    next: "XXX"
                });
            });
        };

        self.add_report_goods_question = function(report_name, opts) {
            opts = _.defaults(opts || {
                state: DecimalState,
                check: self.check_int(0, 20000)
            });
            return self.add_report_question(report_name, opts);
        });

        self.add_report_total = function(total_name, opts) {
            self.states.add('states:report:' + total_name, function(name) {
                return new FreeTextSate(name, {
                    question: "XXX",
                    next: "XXX"
                });
            });
        };

        self.add_report_question('school_id', function(name) {
            return "XXX";
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
            values: ['attendance_male', 'attendance_female'],
        });

        self.add_report_question('beneficiaries_male', {
            question: $('Male beneficiaries (highest):'),
            check: self.check_int(0, 'enrollment_male')
        });

        self.add_report_question('beneficiaries_female', {
            question: $('Female beneficiaries (highest):'),
            check: self.check_int(0, 'enrollment_female')
        });

        self.add_report_total('beneficiaries_total', {
            values: ['beneficiaries_male', 'beneficiaries_female'],
        });

        self.add_report_question('not_fed:lack_of_food', {
            question: $('Number of days pupils not fed for - Lack of food:'),
            check: self.check_int(0, 'days_in_session - days_of_feeding')
        });

        self.add_report_question('not_fed:lack_of_firewood', {
            question: $('Number of days pupils not fed for - Lack of firewood:'),
            check: self.check_int(0, 'days_in_session - days_of_feeding')
        });

        self.add_report_question('not_fed:lack_of_water', {
            question: $('Number of days pupils not fed for - Lack of water:'),
            check: self.check_int(0, 'days_in_session - days_of_feeding')
        });

        self.add_report_question('not_fed:cooks_absent', {
            question: $('Number of days pupils not fed for - Cooks absent:'),
            check: self.check_int(0, 'days_in_session - days_of_feeding')
        });

        self.add_report_question('not_fed:pupils_dislike_food', {
            question: $('Number of days pupils not fed for - Pupils dislike food:'),
            check: self.check_int(0, 'days_in_session - days_of_feeding')
        });

        self.add_report_question('not_fed:other', {
            question: $('Number of days pupils not fed for - Other:'),
            check: self.check_int(0, 'days_in_session - days_of_feeding')
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

        // End

        self.states.add('states:end', function(name) {
            return new EndState(name, {
                text: $('Bye!')
                next: 'states:start'
            });
        });
    });

    return {
        GoApp: GoApp
    };
}();
