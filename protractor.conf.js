let baseConfig = require('./config/register')({
    env: 'local',
    //  browser: 'puppeteer'
});

exports.config = {
    ...baseConfig.config,
    specs: [
        'tests/compliance/compliance.feature'
    ],
}