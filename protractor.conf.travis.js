let baseConfig = require('./config/register')({
    env: 'production',
    params: {
        browser: 'puppeteer',
        extensions: 'metamask'
    }
});

exports.config = {
    ...baseConfig.config,
    specs: [
        'tests/compliance/complianceSanity.feature'
    ],
}