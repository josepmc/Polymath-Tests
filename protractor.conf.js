let baseConfig = require('./config/register')({
    env: 'local',
    browser: 'chrome'
});

exports.config = {
    ...baseConfig.config,
    specs: [
        //'tests/notice/notice.feature',
        //'tests/investor/nonExisting.feature',
        'tests/investor/invest.feature',
        //'tests/ticker/reserve.feature',
        //'tests/compliance/complianceSanity.feature'
    ],
}