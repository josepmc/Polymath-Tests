let baseConfig = require('./config/register')({
    env: 'local'
});

exports.config = {
    ...baseConfig.config,
    specs: [
        'tests/compliance/compliance.feature'
    ],
}