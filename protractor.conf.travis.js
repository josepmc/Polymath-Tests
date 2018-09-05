exports.config = require('./config/register')({
    env: 'local',
    params: {
        browser: 'chrome',
        extensions: 'metamask',
        tags: '@sanity or @status'
    }
}).config;