let baseConfig = require('./config/register')({
    env: 'local',
    browser: 'dappeteer'
});

exports.config = {
    ...baseConfig.config,
    specs: [
        'tests/auth/sign.feature'
    ],
}