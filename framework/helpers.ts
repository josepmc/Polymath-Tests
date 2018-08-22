import 'reflect-metadata';
export { TestConfig } from './testConfig';
export { RunnerConfig } from '../config/definition'; // TODO: Refactor this
import { By as WebdriverBy } from 'selenium-webdriver';
import { helperBrowsers, ProtractorBy } from 'protractor';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
chai.config.includeStack = true;
export let expect = chai.expect;
export let assert = chai.assert;
export let should = chai.should;
export * from './tmp';
import { ObjectHelper } from './objectHelper';
import { ByWrapper } from './object/wrapper/browser';
export { LocatorCompare } from './object/shared';
export { NumberRange } from './object/interfaces';
export { ElementWrapper, WindowInfo } from './object/wrapper';
export let oh: ObjectHelper = new ObjectHelper(() => helperBrowsers);
export type Locator = WebdriverBy;
export const Locator = {
    ...WebdriverBy, instanceOf: loc =>
        loc instanceof WebdriverBy || loc instanceof ProtractorBy || (loc['using'] && loc['value'])
};
export let By: ByWrapper;
export let by: ByWrapper;
module.exports = {
    ...module.exports,
    get By(): Locator {
        return (module.exports.oh && module.exports.oh.By) || null;
    },
    get by(): Locator { return By; }
}
