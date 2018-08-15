exports.config = require('./config/register')({
    env: 'local',
    params: {
        browser: 'puppeteer',
        extensions: 'metamask',
        tags: '@sanity or @status'
    }
}).config;