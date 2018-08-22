let baseConfig = require('./config/register')({
    env: 'local',
    browser: 'puppeteer'
});

exports.config = {
    ...baseConfig.config,
    specs: [
        'tests/ticker/reserve.feature',
        //'tests/compliance/complianceSanity.feature'
    ],
}