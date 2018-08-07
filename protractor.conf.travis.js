let baseConfig = require('./config/register')({
    env: 'production',
    browser: 'puppeteer'
});

exports.config = {
    ...baseConfig.config,
    specs: [
        'tests/compliance/compliance.feature'
    ],
}