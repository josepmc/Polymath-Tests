import extend = require('extend');
import { assert, By, ElementWrapper, Locator, NumberRange, oh } from '../../helpers';
import { AbstractObject } from '../abstract';
import striptags = require('striptags');
import clone = require('clone');
import { SimplePhoto } from '../abstractPhoto';
import * as moment from 'moment';
import { FnNames, generateName } from './shared';

/**
 * As a general rule for all the decorators, the following information is vital:
 * ATTENTION: null !== undefined for the decorators
 * null means that the field IS PRESENT, but that no value (or mapping) is selected
 * undefined means that the field IS NOT PRESENT
 */

export const dirty: Symbol = Symbol('dirty');

export function order(number: number) {
    return (target: AbstractObject, property: string | symbol): void => {
        // Create new property with getter and setter
        target[generateName(FnNames.Order, property)] = number;
    };
}

// tslint:disable-next-line:valid-jsdoc
/**
 * This decorator is used in order to trigger the 'set' and 'get' methods of an element whenever another one is 'getted' or 'setted'
 * This is useful in cases where you have a field and a 'field confirmation' (e.g. email).
 * Beware that this means that whenever you SET a value to the first field, the second field will ALSO have that value automatically set
 * @param {string} targetProperty The property to 'mirror'
 */
export function fillWith(targetProperty: string) {
    return (target: Object, appliedProperty: string | symbol) => {
        let targetGetFn = target[generateName(FnNames.Get, targetProperty)];
        assert(!!targetGetFn, `Decorator Setup: Error! Can't set up a mirror property ${appliedProperty.toString()} for ${targetProperty}, the 'get' method doesn't exist`);
        let targetSetFn = target[generateName(FnNames.Set, targetProperty)];
        let mirrorGetFn = target[generateName(FnNames.Get, appliedProperty)];
        let mirrorSetFn = target[generateName(FnNames.Set, appliedProperty)];
        target[generateName(FnNames.Get, targetProperty)] = async function () {
            await targetGetFn.call(this);
            if (mirrorGetFn) await mirrorGetFn.call(this);
            else target[appliedProperty] = target[targetProperty];
        };
        if (targetSetFn) {
            target[generateName(FnNames.Set, targetProperty)] = async function (value, force: boolean = false) {
                await targetSetFn.call(this, value, force);
                if (!force) {
                    if (mirrorSetFn) await mirrorSetFn.call(this, value, force);
                    else target[appliedProperty] = target[targetProperty];
                }
            };
        }
    };
}

export enum NumberParseMethod {
    ParseInt, Number, ParseFloat,
}

export interface CallOpts {
    get?: () => Promise<any>;
    set?: (obj: any) => Promise<void>;
    preGet?: () => Promise<void>;
    postGet?: () => Promise<void>;
    preSet?: (value) => Promise<void>;
    postSet?: (value) => Promise<void>;
    mainFieldLocator?: Locator | (() => Promise<Locator>);
    defaultValue?: Object;
    numberParseMethod?: NumberParseMethod;
    dateFormat?: moment.MomentFormatSpecification;
    causesRefresh?: boolean;
    locatorStrategy?: (...args) => Locator;
    context?: {};
}

function parseNumber(value: string, parseMethod: NumberParseMethod): number {
    switch (parseMethod) {
        default:
        case NumberParseMethod.ParseInt:
            return parseInt(value.replace('.', ''));
        case NumberParseMethod.ParseFloat:
            return parseFloat(value);
        case NumberParseMethod.Number:
            return Number(value);
    }
}
const holder: Symbol = Symbol('Holder');
const oldValue: Symbol = Symbol('OldValue');
// tslint:disable-next-line:valid-jsdoc
/**
 * Base decorator to use to extend for different input types. Has the following attributes declared:
 * target: AbstractObject (the target element)
 * property: string | symbol (the property to replace)
 *
 * @export
 * @template T The type to use across the get/set methods
 * @param {() => Promise<T>} getFn The async get method. Should take care of storing the value
 * @param {(param: T) => Promise<void>} setFn
 * @returns
 */
export function customDecorator<T>(getFn: () => Promise<T>, setFn?: (param: T) => Promise<void>, context: { [key: string]: Object } = {}, opts?: CallOpts) {
    return function (target: AbstractObject, property: string | symbol): void {
        // property value
        opts = opts || {};
        context = context || opts.context || {};
        let desc = Object.getOwnPropertyDescriptor(target, property);
        Reflect.defineMetadata(holder, opts.defaultValue || (desc && desc.value), target, property);
        delete target[property];

        // Create new property with getter and setter
        Object.defineProperty(target, property, {
            get: function (): T {
                return Reflect.getMetadata(holder, this, property);
            },
            set: function (newVal: T) {
                let _val = Reflect.getMetadata(holder, this, property);
                assert(setFn || newVal === undefined, `${property.toString()}: Can't set the value using this method, no setter found.`);
                if (newVal === undefined && _val !== undefined)
                    console.warn(`${property.toString()}: Attention! null =: Field is present, but no meaningful value is selected.
                    undefined := The field is not present.
                    You shouldn't set this field to 'undefined', but rather to 'null'. Was this call intended?.`);
                if (_val instanceof AbstractObject) {
                    console.warn(`${property.toString()}: Attention! You are going to replace an AbstractObject object. This is highly discouraged. Was this call intended?.`);
                }
                Reflect.defineMetadata(holder, newVal, this, property);
                Reflect.defineMetadata(oldValue, _val, this, property);
                Reflect.defineMetadata(dirty, true, this, property);
            },
            enumerable: true,
            configurable: false,
        });
        context.property = property;
        context.opts = opts;

        target[generateName(FnNames.Get, property)] = async function (): Promise<T> {
            // Make sure not to use arrow functions and use async function() { }. Otherwise you won't get the context
            // TODO(@JMC): Add some verbose option or sth like that
            let params = extend(false, clone(context), { target: context.target || this });
            let _val = Reflect.getMetadata(holder, this, property);
            let fn = opts.get || getFn;
            try {
                if (opts && opts.preGet) await opts.preGet.call(params);
                _val = fn ? await fn.call(params) : undefined;
                if (opts && opts.postGet) {
                    params._val = _val;
                    await opts.postGet.call(params);
                    _val = params._val;
                }
            } catch (err) {
                debugger;
                console.log(`Get - ${property.toString()}: An error ocurred`);
                if (err) throw err;
            }
            Reflect.defineMetadata(holder, _val, this, property);
            console.log(`Getting ${property.toString()} => ${_val}`);
            return _val;
        };

        target[generateName(FnNames.Set, property)] = async function (value: T, force: boolean = false): Promise<void> {
            // Make sure not to use arrow functions and use async function() { }. Otherwise you won't get the context
            let _val = Reflect.getMetadata(oldValue, this, property);
            let fn = opts.set || setFn;
            if (fn) {
                value = await value;
                console.log(`Setting ${property.toString()} from ${_val} to ${value}`);
                // TODO(@JG): Add functionality to know if the value is present or not (or finally set) - only debugging
                if (_val === value && !force)
                    return; // Avoid setting the same value again
                let params = extend(false, clone(context), { target: context.target || this, _val: value, _oldVal: _val, _get: target[generateName(FnNames.Get, property)] });
                try {
                    if (opts && opts.preSet) await opts.preSet.call(params, value);
                    await fn.call(params, params._val);
                    if (opts && opts.postSet) await opts.postSet.call(params, value);
                } catch (err) {
                    debugger;
                    console.log(`Set - ${property.toString()}: An error ocurred`);
                    if (err) throw err;
                }
                Reflect.deleteMetadata(oldValue, this, property);
                Reflect.defineMetadata(holder, params._val, this, property);
            } else console.warn(`${property.toString()} is a readonly field`);
        };
        if (opts.mainFieldLocator) {
            target[generateName(FnNames.Main, property)] = opts.mainFieldLocator;
        }
    };
}

export enum LabelOptsMode {
    Html, Value, Text, HtmlStripped,
}
export interface LabelOpts extends CallOpts {
    mode?: LabelOptsMode;
    matchNo?: number;
}

async function parseText<T extends string | number | string[] | number[] | Date | Date[]>(els: string[], regex: RegExp, opts: LabelOpts, locator: Locator): Promise<T> {
    let numbers: number[] = [], texts: string[] = [], dates: Date[] = [];
    for (let text of els) {
        if (opts.mode === LabelOptsMode.HtmlStripped) text = striptags(text);
        if (regex) {
            let matches = regex.exec(text);
            let numMatches = opts.matchNo || 1;
            if (opts.matchNo && (!matches || matches.length <= numMatches)) {
                text = '';
            } else {
                assert(matches && (opts.matchNo || matches.length === 2),
                    `ParseText - Error! ${this.property}: Error! Regex yields ${!matches ? 0 : matches.length} results, should yield ${numMatches} for ${locator['value']}`);
                text = matches[numMatches];
            }
        }
        if (!text) {
            texts.push('');
            continue;
        }
        texts.push(text);
        if (opts.dateFormat) {
            let date = moment(text, opts.dateFormat);
            if (date) dates.push(date.toDate());
        }
        let altText = text.replace(/[,\.]/g, '').trim();
        let number = parseNumber(altText, opts.numberParseMethod);
        if (!isNaN(number) && altText === number.toString()) numbers.push(number);
    }
    let retArray = (texts.length === dates.length && opts.dateFormat) ? dates : (texts.length === numbers.length) ? numbers : texts;
    if (retArray.length === 1) return retArray[0] as T;
    else if (!retArray.length) return '' as T;
    else return retArray as T;
}

export function label<T extends string | number | string[] | number[] | Date | Date[]>(locator: Locator, regex: RegExp = null, opts: LabelOpts = {}) {
    opts.mainFieldLocator = opts.mainFieldLocator || locator;
    opts.mode = opts.mode || LabelOptsMode.Html;
    return customDecorator<T>(async function (): Promise<T> {
        // Field not present (optional)
        if (!await oh.present(locator, this.target.element)) return undefined;
        let mode: (...params) => Promise<string>;
        switch (opts.mode) {
            case LabelOptsMode.HtmlStripped:
            case LabelOptsMode.Html: mode = oh.html; break;
            case LabelOptsMode.Text: mode = oh.text; break;
            case LabelOptsMode.Value: mode = oh.value; break;
        }
        let els = await oh.executeArray(locator, mode, this.target.element);
        // Apply Regex
        return parseText.call(this, els, regex, opts, locator) as T;
    }, null, null, opts);
}

export function present(locator: Locator, mapping: MapContainer<number> = null, opts: CallOpts = {}) {
    opts.mainFieldLocator = opts.mainFieldLocator || locator;
    return customDecorator<boolean | number>(async function (): Promise<boolean | number> {
        // Field not present (optional)
        let present = await oh.present(locator, this.target.element);
        if (!present || !mapping) return present;
        let element = await oh.by(locator, this.target.element);
        let res: number = 0, modified = false;
        for (let idx of Object.keys(mapping)) {
            if (await oh.present((opts.locatorStrategy || By.xpath)(idx), element)) {
                modified = true;
                res = res | mapping[idx];
            }
        }
        return modified ? res : undefined;
    }, null, null, opts);
}

// tslint:disable-next-line:valid-jsdoc
/**
 * Decorator that transforms a field with type NumberRange into a PO-friendly set of methods that read/write from two fields
 *
 * @export
 * @param {Locator} minimum The locator to the field "minimum"
 * @param {Locator} maximum The locator to the field "maximum"
 * @returns The decorator itself
 */
export function range(minimum: Locator, maximum: Locator, opts: CallOpts = { mainFieldLocator: minimum }) {
    opts.mainFieldLocator = opts.mainFieldLocator || minimum;
    return customDecorator(async function (): Promise<NumberRange> {
        // Field not present (optional)
        if (!await oh.present(minimum, this.target.element) || !await oh.present(maximum, this.target.element)) return undefined;
        return { minimum: await oh.number(minimum, this.target.element), maximum: await oh.number(maximum, this.target.element) };
    }, async function (value: NumberRange): Promise<void> {
        // Field not present (optional)
        if (!await oh.present(minimum, this.target.element) || !await oh.present(maximum, this.target.element)) return undefined;
        if (!value) value = { minimum: undefined, maximum: undefined };
        await oh.typeCleared(minimum, value.minimum, this.target.element);
        await oh.typeCleared(maximum, value.maximum, this.target.element);
    }, null, opts);
}


const isSelected = async function (element: ElementWrapper, opts: CheckedOpts) {
    return (opts.checkedSelector && (
        (typeof opts.checkedSelector === 'function' && await opts.checkedSelector.call(this, element)) ||
        (Locator.instanceOf(opts.checkedSelector) && await oh.present(opts.checkedSelector, element))
    )) || await oh.selected(element);
};

export interface CheckedOpts extends CallOpts {
    checkedSelector?: Locator | Function;
    supportsCheck?: boolean;
    /**
     * A method to click on custom implementations
     * Returns whether we should finish looking for an element to click or whether we should click it straight away
     *
     * @memberOf CheckedOpts
     */
    customClick?: (element: ElementWrapper) => Promise<boolean>;
}

export interface ComboBoxOpts extends MultiFieldOpts {
    noEmptyOptionPresent?: boolean;
    formatFn?: (idx: string) => string;
}

export type MapContainer<T extends number | string = number | string> = { [key: string]: T };
export type Map = { [key: string]: MapContainer };

// tslint:disable-next-line:valid-jsdoc
/**
 * A decorator that allows for mapping a number (to be associated with the mapping) to a PO combobox
 *
 * @export
 * @param {Locator} locator A to the 'select' element. All the values need to be located under it
 * @param {MapContainer} mapping Maps XPath selectors to the enum values
 * @returns The decorator itself
 */
export function comboBox(locator: Locator, mapping: MapContainer | Map, opts: ComboBoxOpts = {}) {
    opts.type = CheckType.MappingValue;
    opts.supportsCheck = false;
    if (!opts.checkedSelector) opts.checkedSelector = async function (element: ElementWrapper) {
        return await oh.value(element) === await oh.value(By.xpath('parent::*'), element);
    };
    let supraMapping = {}, map: Map = (Object.keys(mapping).every(el => mapping[el] instanceof Object) ? mapping : { General: mapping }) as Map;
    let formatFn = opts.formatFn || (idx => `.//*[@value="${idx}"]`);
    for (let mIdx of Object.keys(map)) {
        let newMapping = {};
        for (let idx of Object.keys(map[mIdx])) newMapping[formatFn(idx)] = map[mIdx][idx];
        if (!opts.noEmptyOptionPresent) {
            let oldVal = newMapping[`.//*[@value=""]`] || '';
            delete newMapping[`.//*[@value=""]`];
            newMapping[`.//*[normalize-space(text())="" or @value=""]`] = oldVal;
        }
        supraMapping[mIdx] = newMapping;
    }
    return multiField(locator, supraMapping, opts);
}

export enum ClickMode {
    Checkbox = 1 << 1,
    Button = 1 << 2,
    ClickBeforeGet = 1 << 3,
    ClickAfterGet = 1 << 4,
    ClickBeforeSet = 1 << 5,
    ClickAfterSet = 1 << 6,
    InputWithCheckbox = Checkbox,
    InputHiddenWithButtonTrigger = Button | ClickBeforeGet | ClickAfterGet | ClickBeforeSet | ClickAfterSet,
    InputWithApplyButton = Button | ClickAfterSet,
    InputNeedsClickOnlyBefore = Button | ClickBeforeGet | ClickBeforeSet,
}

export interface InputFieldCallOpts extends CheckedOpts {
    clickMode?: ClickMode;
    ByText?: boolean;
    neverClear?: boolean;
    sendEnter?: boolean;
}

// tslint:disable-next-line:valid-jsdoc
/**
 * A decorator that maps an attribute from the type number | string into a PO string | number field (e.g. an input[type="text"])
 * It can also serve an array of number | string fields (e.g. in the case where they're extremely related from the Data Object's PoV)
 *
 * @export
 * @template T Either a number, a string, or an array of either of them.
 * @param {Locator} locator The locator into the number | string field. Alternatively, the locator into multiple number | string fields.
 * @param {Locator} clickLocator The locator into an associated checkbox (array) field.
 * Alternatively, the locator into (the array of) fields that will be clicked before accessing the number | string field.
 * @returns The decorator itself
 */
export function inputField<T extends number | string | number[] | string[]>(locatorPre: Locator | Function, clickLocator?: Locator,
    opts: InputFieldCallOpts = { clickMode: ClickMode.Checkbox }) {
    if (opts.causesRefresh === undefined) opts.causesRefresh = false;
    opts.checkedSelector = opts.checkedSelector || By.xpath('self::*[contains(@class,"checked") or parent::*[contains(@class,"checked")]]');
    opts.mainFieldLocator = opts.mainFieldLocator || locatorPre instanceof Function ? null : locatorPre;
    return customDecorator<T>(async function (): Promise<T> {
        let locator = locatorPre instanceof Function ? locatorPre.apply(this.target) : locatorPre;
        // Field not present (optional)
        // Check that it's visible (there are some fields that are 'hidden', e.g. epcDescription)
        if (!await oh.present(locator, this.target.element)) return undefined;
        let visible = await oh.visible(this.target.element)();
        if (!visible)
            return undefined;
        // Click here for textarea, make sure it's not a checkbox
        let inputs = await oh.all(locator, this.target.element);
        let clickables = clickLocator ? await oh.all(clickLocator, this.target.element) : [];
        if (clickables.length) {
            assert(clickables.length === inputs.length || clickables.length === 1, `Decorator - InputField: Can't map more than one checkboxes to one input field`);
        }
        let numbers: number[] = [], texts: string[] = [];
        for (let [idx, el] of inputs.entries()) {
            if (clickables.length && opts.clickMode & ClickMode.ClickBeforeGet) {
                await oh.moveClick(clickables[idx], null, opts.causesRefresh);
                await oh.wait(oh.visible(el), `Decorator - InputField: Timeout: Waiting for element to be displayed`);
            }
            let text = opts.ByText ? await oh.text(el) : await oh.value(el);
            texts.push(text);
            let number = /(\d+).*/.exec(text) ? parseNumber(text.replace('.', ''), opts.numberParseMethod) : NaN; // Attention! This may yield incomplete values
            if (!isNaN(number)) numbers.push(number);
            if (clickables.length && opts.clickMode & ClickMode.Checkbox) {
                let temp = (!!number) === await isSelected.call(this, clickables[idx], opts);
                assert(temp, `Decorator - InputField: Checkbox status should be ${number ? 'checked' : 'unchecked'}`);
            }
            if (clickables.length && opts.clickMode & ClickMode.ClickAfterGet) {
                await oh.moveClick(clickables[idx], null, opts.causesRefresh);
                await oh.wait(oh.invisible(el), `Decorator - InputField: Timeout: Waiting for element to be displayed`);
            }
        }
        let retArray = texts.length === numbers.length ? numbers : texts;
        if (retArray.length === 1) return retArray[0] as T;
        else if (!retArray.length) return '' as T;
        else return retArray as T;
    }, async function (value: T): Promise<void> {
        let locator = locatorPre instanceof Function ? locatorPre.apply(this.target) : locatorPre;
        // Field not present (optional)
        if (!await oh.present(locator, this.target.element) || !(await oh.visible(locator, this.target.element)()))
            return undefined;
        let clickables = clickLocator ? await oh.all(clickLocator, this.target.element) : [];
        for (let [idx, el] of (await oh.all(locator, this.target.element)).entries()) {
            if (clickables.length && opts.clickMode & ClickMode.ClickBeforeSet) {
                await oh.moveClick(clickables[idx], null, opts.causesRefresh);
                await oh.wait(oh.visible(el), `Decorator - InputField: Timeout: Waiting for element to be displayed`);
            }
            if (clickables.length && opts.clickMode & ClickMode.Checkbox) {
                let checked = await isSelected.call(this, clickables[idx], opts);
                if (checked !== (!!value)) await oh.moveClick(clickables[idx], null, opts.causesRefresh);
            }
            // Clear only if the element is enabled
            if (await oh.enabled(el, this.target.element)) {
                let val = value instanceof Array ? value[idx] : value;
                if (!val) {
                    if (!opts.neverClear) await oh.clear(el, this.target.element);
                } else opts.neverClear ? await oh.type(el, val, 0, this.target.element) :
                    await oh.typeCleared(el, val, this.target.element);
            } else {
                assert(!value && value != 0, `Decorator - InputField: Error! Can't type in a disabled checkbox`);
            }
            if (opts.sendEnter) {
                await oh.type(el, oh.key.ENTER, 0, this.target.element);
            }
            if (clickLocator && opts.clickMode & ClickMode.ClickAfterSet) {
                if (!clickables.length) clickables = await oh.all(clickLocator, this.target.element);
                if (clickables.length) await oh.moveClick(clickables[idx], null, opts.causesRefresh);
            }
        }
    }, null, opts);
}

// tslint:disable-next-line:valid-jsdoc
/**
 * A decorator for a single checkbox. We could be using multiCheckbox also, but that's an overkill for a single checkbox.
 *
 * @export
 * @param {Locator} locator The locator for the single checkbox
 * @returns The decorator itself
 */
export function singleCheckbox(locator: Locator, opts: MultiFieldOpts = { checkedSelector: null }) {
    let obj = { General: {} };
    obj.General['self::*'] = 0;
    opts.type = CheckType.Boolean;
    opts.checkedSelector = opts.checkedSelector || By.xpath('self::*[contains(@class,"checked") or parent::*[contains(@class,"checked")]]');
    return multiField(locator, obj, opts);
}

export enum CheckType {
    Value, Text, Number, MappingValue, Boolean,
}

export interface MultiFieldOpts extends CheckedOpts {
    type?: CheckType;
    orValues?: boolean;
    bestEffort?: boolean;
    generalLocAsParent?: boolean;
    ignoreTargetElement?: boolean;
    ignoreNotVisible?: boolean;
}

function multiField(baseOrMultifieldLocator: Locator | (() => Promise<Locator>), mapping: Map,
    opts: MultiFieldOpts = { type: CheckType.Text, checkedSelector: null, orValues: true, mainFieldLocator: baseOrMultifieldLocator }) {
    if (opts.causesRefresh === undefined) opts.causesRefresh = false;
    if (opts.supportsCheck === undefined) opts.supportsCheck = true;
    opts.mainFieldLocator = opts.mainFieldLocator || baseOrMultifieldLocator;
    // ATTENTION! This method is using 'this.target.element' as a 'parent' instead of the 'allFieldsLocator'
    // This may yield to future problems, in some cases
    const findMapped = async function () {
        let allFieldsLocator = await oh.all(baseOrMultifieldLocator, !opts.ignoreTargetElement && this.target.element);
        let base = allFieldsLocator.length === 1 ? allFieldsLocator[0] : this.target.element;
        let max: { numberOfHits: number, value: string } = { numberOfHits: -1, value: null };
        // opts.bestEffort looks for the maximum number of present & visible elements
        // !opts.bestEffort does the same, but will discard mappings that have some elements not present
        for (let index of Object.keys(mapping)) {
            let field = mapping[index];
            let allFieldsPresent = true, numberValid = 0;
            for (let selector of Object.keys(field)) {
                let sel;
                let present;
                if (baseOrMultifieldLocator['using'] === '-android uiautomator') {
                    sel = By.androidChildFrom(baseOrMultifieldLocator['originalLocator'], selector);
                    present = await oh.present(sel) && (opts.ignoreNotVisible || await oh.visible(sel)()); // isDisplayed is not implemented correctly on android
                } else {
                    sel = (opts.locatorStrategy || By.xpath)(opts.generalLocAsParent ? `${baseOrMultifieldLocator['value']}[${selector}]` : selector);
                    present = await oh.present(sel, base) && (opts.ignoreNotVisible || await oh.visible(sel, base)());
                }
                allFieldsPresent = allFieldsPresent && present;
                if (present) numberValid++;
                if (!allFieldsPresent && !opts.bestEffort) break;
            }
            if (!opts.bestEffort && !allFieldsPresent) continue;
            if (numberValid > max.numberOfHits) {
                max = { numberOfHits: numberValid, value: index };
            }
        }
        if (allFieldsLocator.length > 1 && !opts.bestEffort && mapping[max.value])
            assert(Object.keys(mapping[max.value]).length === allFieldsLocator.length,
                `MultiField - ${this.property} - ${baseOrMultifieldLocator['value']}: Error! We expected to have ${allFieldsLocator.length} fields present`);
        return max.value;
    };
    return customDecorator(async function (): Promise<number> {
        // For these cases where the field is not present (optional)
        if (opts.mainFieldLocator instanceof Function)
            baseOrMultifieldLocator = await opts.mainFieldLocator.call(this);
        if (!await oh.present(baseOrMultifieldLocator, !opts.ignoreTargetElement && this.target.element)) return undefined;
        let allFieldsLocator = await oh.all(baseOrMultifieldLocator, !opts.ignoreTargetElement && this.target.element);
        let base = allFieldsLocator.length === 1 ? allFieldsLocator[0] : this.target.element;
        let mapped = await findMapped.call(this);
        if (!mapped) {
            debugger;
            mapped = await findMapped.call(this);
        }
        if (!mapped) return undefined;
        let selectedValue = null;
        // Set default values
        switch (opts.type) {
            case CheckType.Value:
            case CheckType.Text:
                selectedValue = '';
                break;
            case CheckType.Number:
            case CheckType.MappingValue:
                selectedValue = 0;
                break;
        }
        for (let selector of Object.keys(mapping[mapped])) {
            let mappedValue = mapping[mapped][selector];
            let sel;
            if (baseOrMultifieldLocator['using'] === '-android uiautomator') {
                sel = By.androidChildFrom(baseOrMultifieldLocator['originalLocator'], selector);
            } else {
                sel = (opts.locatorStrategy || By.xpath)(opts.generalLocAsParent ? `${baseOrMultifieldLocator['value']}[${selector}]` : selector);
            }
            if (opts.bestEffort && !(await oh.present(sel, base))) continue;
            let element = await oh.by(sel, base);
            if (opts.type === CheckType.Boolean) {
                let newVal = await isSelected.call(this, element, opts);
                assert(selectedValue === null || !newVal, `MultiField - ${this.property}: Error! CheckType.Boolean only accepts one element selected`);
                selectedValue = newVal;
            } else if (await isSelected.call(this, element, opts)) {
                assert(opts.orValues || !selectedValue, `MultiField - ${this.property}: Error! More than one element is checked`);
                let number;
                switch (opts.type) {
                    case CheckType.Value:
                        selectedValue = await oh.value(element);
                        break;
                    case CheckType.Text:
                        selectedValue = await oh.text(element);
                        break;
                    case CheckType.Number:
                        number = parseNumber(await oh.text(element), opts.numberParseMethod);
                        assert.isNotNaN(number, `Multifield - ${this.property} - Error: Expected an array of numbers but got text`);
                        if (opts.orValues) selectedValue |= number;
                        else selectedValue = number;
                        break;
                    case CheckType.MappingValue:
                        number = parseNumber(mappedValue.toString(), opts.numberParseMethod);
                        if (opts.orValues) {
                            assert.isNotNaN(number, `Multifield - ${this.property} - Error: Expected an array of numbers but got text`);
                            selectedValue |= number;
                        } else {
                            selectedValue = isNaN(number) ? mappedValue : number;
                        }
                        break;
                }
            }
        }
        return selectedValue;
    }, async function (value: number): Promise<void> {
        if (opts.mainFieldLocator instanceof Function)
            baseOrMultifieldLocator = await opts.mainFieldLocator.call(this);
        // For these cases where the field is not present (e.g. optional)
        if (!await oh.present(baseOrMultifieldLocator, !opts.ignoreTargetElement && this.target.element)) return;
        let allFieldsLocator = await oh.all(baseOrMultifieldLocator, !opts.ignoreTargetElement && this.target.element);
        let base = allFieldsLocator.length === 1 ? allFieldsLocator[0] : this.target.element;
        let mapped = await findMapped.call(this);
        if (!mapped) {
            debugger;
            mapped = await findMapped.call(this);
        }
        assert(!!mapped, `MultiField: Error! No mapping is present for ${this.property}, can't set any values`);
        let somethingChecked = 0;
        for (let selector of Object.keys(mapping[mapped])) {
            let mappedValue = mapping[mapped][selector];
            let sel;
            if (baseOrMultifieldLocator['using'] === '-android uiautomator') {
                sel = By.androidChildFrom(baseOrMultifieldLocator['originalLocator'], selector);
            } else {
                sel = (opts.locatorStrategy || By.xpath)(opts.generalLocAsParent ? `${baseOrMultifieldLocator['value']}[${selector}]` : selector);
            }
            if (opts.bestEffort && !(await oh.present(sel, base))) continue;
            let element;
            if (baseOrMultifieldLocator['using'] === '-android uiautomator') {
                element = await oh.by(sel);
            } else {
                element = await oh.by(sel, base);
            }
            let checked = await isSelected.call(this, element, opts);
            let shouldBeChecked = false;
            if (opts.type === CheckType.Boolean) {
                shouldBeChecked = Boolean(value);
            }
            if (opts.type === CheckType.MappingValue) {
                let elNumber = parseNumber(mappedValue.toString(), opts.numberParseMethod);
                if (!isNaN(elNumber)) {
                    if (opts.orValues) {
                        shouldBeChecked = (value & elNumber) > 0 || (value === 0 && elNumber === 0);
                    } else {
                        shouldBeChecked = value === elNumber;
                    }
                } else shouldBeChecked = String(value) === mappedValue;
            }
            if (opts.type === CheckType.Value) {
                let elValue = await oh.value(element);
                if (elValue) {
                    let elNumber = parseNumber(elValue, opts.numberParseMethod);
                    if (!isNaN(elNumber)) {
                        if (opts.orValues) {
                            shouldBeChecked = (value & elNumber) > 0 || (value === 0 && elNumber === 0);
                        } else {
                            shouldBeChecked = value === elNumber;
                        }
                    } else shouldBeChecked = String(value) === elValue;
                }
            } else if (opts.type === CheckType.Text) {
                let elValue = await oh.text(element);
                shouldBeChecked = String(value) === elValue;
            } else if (opts.type === CheckType.Number) {
                let number = parseNumber(await oh.text(element), opts.numberParseMethod);
                assert.isNotNaN(number, `Multifield - ${this.property} - Error: Expected an array of numbers but got text`);
                shouldBeChecked = (value & number) > 0;
            }

            // We can't do a switch because node-debug2 will crash immediately if we do
            // switch (opts.type) {
            //     case CheckType.Value:
            //         shouldBeChecked = shouldBeChecked && (value | parseInt(await oh.value(element))) !== 0;
            //         break;
            //     case CheckType.Text:
            //         throw `NotImplementedException: Does this case even exist?`;
            //     case CheckType.Number:
            //         let number = parseInt(await oh.text(element));
            //         assert.isNotNaN(number, `Error: Expected an array of numbers but got text`);
            //         shouldBeChecked = shouldBeChecked && (value | number) !== 0;
            //         break;
            //     case CheckType.MappingValue:
            //         break;
            // }
            if (shouldBeChecked) somethingChecked++;
            assert(opts.orValues || somethingChecked <= 1,
                `Multifield - ${this.property} - : Error! More than one value to be selected but expected only one candidate!`);
            if (opts.supportsCheck) {
                assert.isBoolean(checked,
                    `Multifield - ${this.property} - : Error! Couldn't find out whether object is checked,
                 set opts.supportsCheck to false to disable this: ${baseOrMultifieldLocator['value']}`);
                if (shouldBeChecked !== checked) {
                    if (opts.customClick)
                        await opts.customClick.call(this, element);
                    else await oh.moveClick(element, null, opts.causesRefresh, true);
                    assert(!checked === await isSelected.call(this, element, opts),
                        `Multifield - ${this.property} - : Error! Clicked an element but didn't get ${shouldBeChecked ? '' : 'un'}selected`);
                    // In case we have a page refresh, we need this or we'll get into a death loop
                    allFieldsLocator = await oh.all(baseOrMultifieldLocator, !opts.ignoreTargetElement && this.target.element);
                    let base = allFieldsLocator.length === 1 ? allFieldsLocator[0] : this.target.element;
                }
            }
            if (!opts.supportsCheck && shouldBeChecked) {
                if (!checked) {
                    if (opts.customClick) {
                        if (await opts.customClick.call(this, element)) {
                            return;
                        }
                    } else {
                        await oh.moveClick(element, null, opts.causesRefresh, true);
                        // In case we have a page refresh, we need this or we'll get into a death loop
                        allFieldsLocator = await oh.all(baseOrMultifieldLocator, !opts.ignoreTargetElement && this.target.element);
                        base = allFieldsLocator.length === 1 ? allFieldsLocator[0] : this.target.element;
                    }
                }
            }
        }
    }, null, opts);
}


// tslint:disable-next-line:valid-jsdoc
/**
 * This decorator maps a group of checkboxes to the values of an enumerator. It allows for the mapping depending on the property type
 * (e.g. set on the mapping), by checking which values are present and taking the one that has all the values present.
 * This means that this decorator WILL FAIL if you repeat 1:1 the same locators between two types (e.g. Sale and Rent would have the same contents in the mapping)
 *
 * @export
 * @param {Locator} locator The general locator for all the checkboxes.
 * This needs to be generic enough to map all the checkboxes yet strict enough to only include these present in the mapping
 * @param {Map} mapping Much like the mapping in the comboBox decorator, but this one adds a new level.
 * Between these levels, the mappings need to be UNIQUE. If you repeat 1:1 all the mappings between the uppermost levels, this decorator will fail.
 * @returns The decorator itself
 */
export function multiCheckbox(locator: Locator, mapping: Map, opts: MultiFieldOpts = { checkedSelector: null }) {
    opts.checkedSelector = opts.checkedSelector || By.xpath('self::*[contains(@class,"checked") or parent::*[contains(@class,"checked")]]');
    opts.type = CheckType.MappingValue;
    opts.orValues = true;
    return multiField(locator, mapping, opts);
}

export function radioBox(locator: Locator, mapping: Map | MapContainer,
    opts: MultiFieldOpts = { type: CheckType.MappingValue }) {
    opts.checkedSelector = opts.checkedSelector || By.xpath('self::*[contains(@class,"checked") or parent::*[contains(@class,"checked")]]');
    if (mapping) {
        let keys = Object.keys(mapping);
        if (keys.length && !(mapping[keys[0]] instanceof Object)) mapping = { General: mapping } as any;
    }
    opts.type = CheckType.MappingValue;
    opts.orValues = false;
    opts.supportsCheck = false;
    return multiField(locator, mapping as any, opts);
}

export interface CustomValuelessCallOpts extends CallOpts {
    getAttribute?: string;
    selectedAttribute?: string;
    ancestorPath?: string;
    customCompare?: (selectedValue: string, intendedValue: string[]) => boolean;
}

export function customValuelessCombobox(optionLocator: Locator,
    opts: CustomValuelessCallOpts =
        { getAttribute: 'value', selectedAttribute: 'value', ancestorPath: 'parent::*' }) {
    if (opts.causesRefresh === undefined) opts.causesRefresh = false;
    opts.getAttribute = opts.getAttribute || 'value';
    opts.selectedAttribute = opts.selectedAttribute || 'value';
    opts.ancestorPath = opts.ancestorPath || 'parent::*';
    opts.mainFieldLocator = opts.mainFieldLocator || optionLocator;
    //let selectedLocator = By.xpath(`${optionLocator['value']}[@selected]`);
    let specificSelector = (val: string[] | number[]) => {
        let baseString = `${optionLocator['value']}[`;
        for (let i = 0; i < val.length; ++i) {
            baseString += `@${opts.getAttribute}="${val[i]}"`;
            if (i + 1 < val.length) baseString += ' or ';
        }
        return By.xpath(`${baseString}]`);
    };
    let selected = async function () {
        {
            // Officially we should be running the following code:
            //return await oh.present(selectedLocator, this.target.element) ? await oh.value(selectedLocator, this.target.element) : null;
            // However, we need to pick up the selected value from the 'select' element itself
            return await oh.attribute(By.xpath(`${optionLocator['value']}/${opts.ancestorPath}`), opts.selectedAttribute, this.target.element);
        }
    };
    return customDecorator<number | string>(async function (): Promise<number | string> {
        // Field not present (optional)
        if (!await oh.present(optionLocator, this.target.element)) return undefined;
        let val = await selected.call(this);
        let number = parseNumber(val, opts.numberParseMethod);
        return isNaN(number) ? val : number;
    }, async function (value: number | string | string[] | number[]) {
        // Field not present (optional)
        if (!await oh.present(optionLocator, this.target.element)) return undefined;
        if (!(value instanceof Array)) value = [value] as string[] | number[];
        let locator = specificSelector(value);
        if (!await oh.present(locator, this.target.element))
            debugger;
        assert(await oh.present(locator, this.target.element), `customValuelessCombobox: Error! Couldn't find the value ${value}`);
        await oh.click(locator, this.target.element, opts.causesRefresh);
        let sel: string = await selected.call(this);
        assert(opts.customCompare ? opts.customCompare(sel, (value as Array<string | number>).map(el => el.toString())) :
            (value as Array<string | number>).findIndex(el => el.toString() === sel) !== -1,
            `customValuelessCombobox: Error! Value (${value}) didn't get selected`);
    }, {
        }, opts);
}

export function attribute<T extends number | string | number[] | string[] | Date | Date[]>(attributeName: string, locator?: Locator, regex?: RegExp, opts: CallOpts = {}) {
    locator = locator || By.xpath('self::*');
    opts.mainFieldLocator = opts.mainFieldLocator || locator;
    return customDecorator<T>(async function (): Promise<T> {
        // Field not present (optional)
        let present = await oh.present(locator, this.target.element);
        if (!present) return undefined;
        let els = await oh.executeArray(locator, oh.attribute, this.target.element, false, attributeName);
        return parseText.call(this, els, regex, opts, locator) as T;
    }, null, null, opts);
}

export interface PhotoOpts extends CallOpts {
    alternativeAttribute?: string[];
}

export function photo(locator: Locator, opts: PhotoOpts = {}) {
    opts.mainFieldLocator = opts.mainFieldLocator || locator;
    return customDecorator<SimplePhoto>(async function (): Promise<SimplePhoto> {
        // Field not present (optional)
        let present = await oh.present(locator, this.target.element);
        if (!present) return undefined;
        let element = await oh.by(locator, this.target.element);
        try {
            return await SimplePhoto.create(element, null, { tryMultiple: false, attribute: opts.alternativeAttribute });
        } catch (error) {
            console.log(`Photo Decorator - Error: ${error}`);
            return null;
        }
    }, null, null, opts);
}
