import { NumberRange } from '../../helpers';

export interface Options { [id: string]: any; }
export abstract class DataGenerator {
    constructor(public seed: number = null) { }
    // tslint:disable-next-line:max-line-length
    // Taken using: {let res = "{"; for(let i of $x('.//*[@name="xcodepays"]/*[@value!=""]')) res = res + "'" + i.text.replace(' ', '_') + "': '" + i.value + "',"; console.log(res + "}"); }
    // tslint:disable-next-line:max-line-length
    public countryList = { 'Albania': 'ALB', 'Algeria': 'ALG', 'Andorra': 'AD ', 'Argentina': 'ARG', 'Armenia': 'ARM', 'Australia': 'AUS', 'Austria': 'A  ', 'Azerbaijan': 'AZE', 'Bangladesh': 'BGD', 'Belarus': 'BER', 'Belgium': 'B  ,B,BE', 'Belize': 'BLZ', 'Bosnia_and Herzegovina': 'BOS', 'Botswana': 'BWA', 'Brazil': 'BRE', 'Bulgaria': 'BG ', 'Cambodia': 'KH ', 'Canada': 'CAN', 'Cape_Verde': 'CPV', 'Chile': 'CL ', 'China': 'CHI', 'Costa_Rica': 'CRI', 'Croatia': 'HR ', 'Cyprus': 'CY ', 'Czechia': 'CZ ', 'Democratic_Republic of the Congo': 'COD', 'Denmark': 'DK ', 'Dominican_Republic': 'DO ', 'Egypt': 'EG ', 'Estonia': 'EE ', 'Finland': 'FIN', 'France': 'F  ', 'Georgia': 'GEO', 'Germany': 'D  ', 'Ghana': 'GH ', 'Greece': 'GR ', 'Hong_kong': 'HON', 'Hungary': 'H  ', 'India': 'IND', 'Indonesia': 'IDN', 'Ireland': 'EIR', 'Israel': 'ISR', 'Italy': 'I  ', 'Ivory_Coast': 'CIV', 'Japan': 'JAP', 'Jordan': 'JOR', 'Kazakhstan': 'KAZ', 'Kenya': 'KEN', 'Kyrgyzstan': 'KIR', 'Latvia': 'LV ', 'Lebanon': 'LIB', 'Liechtenstein': 'FL ', 'Lithuania': 'LT ', 'Luxembourg': 'L  ', 'Macedonia': 'MAC', 'Madagascar': 'MG ', 'Malta': 'MT ', 'Mauritius': 'MU ', 'Mexico': 'MX ', 'Moldova': 'MOL', 'Monaco': 'MC ', 'Montenegro': 'MON', 'Morocco': 'MAR', 'Namibia': 'NAM', 'Netherlands': 'NL ', 'Netherlands_Antilles': 'ANN', 'Norway': 'N  ', 'Panama': 'PA ', 'Paraguay': 'PY ', 'Peru': 'PER', 'Poland': 'PL ', 'Portugal': 'P  ', 'Romania': 'RO ', 'Russia': 'RUS', 'Rwanda': 'RWA', 'Senegal': 'SN ', 'Serbia': 'SER', 'Singapore': 'SGP', 'Slovakia': 'SK ', 'Slovenia': 'SI ', 'South_Africa': 'AFS', 'South_Korea': 'COR', 'Spain': 'ESP', 'Sweden': 'SE ', 'Switzerland': 'CH ', 'Taiwan': 'TAI', 'Tajikistan': 'TAZ', 'Tanzania': 'TZA', 'Thailand': 'TH ', 'Tunisia': 'TUN', 'Turkey': 'TR ', 'Turkmenistan': 'TUR', 'Ukraine': 'UKR', 'United_Arab Emirates': 'ARE', 'United_Kingdom': 'GB ', 'United_States': 'USA', 'Uruguay': 'UY ', 'Uzbekistan': 'OUZ', 'Venezuela': 'VE ', };

    public enumToArray(enumType, keepAll = false, except?: number[]): number[] {
        let integers: number[] = [], strings: string[] = [];
        for (let el in enumType) {
            let elInt = parseInt(el);
            if (!isNaN(elInt)) integers.push(elInt);
            else strings.push(el);
        }
        if (!keepAll) {
            let idx = strings.findIndex(el => el === 'All');
            if (idx >= 0) integers = integers.splice(idx, 1);
        }
        if (except) {
            integers = integers.filter(el => except.indexOf(el) === -1);
        }
        return integers;
    }

    public abstract bool(opts?: Options): boolean;

    public abstract string(opts?: Options): string;

    public abstract first(opts?: Options): string;

    public abstract last(opts?: Options): string;

    public abstract prefix(opts?: Options): string;

    public abstract hash(opts?: Options): string;

    public abstract n<T>(generator: (opts?: Options) => T, count: number, opts?: Options): T[];

    public abstract password(invalid?: boolean): string;

    public abstract phone(opts?: Options): string;

    public abstract email(opts?: Options): string;

    public abstract country(): string;

    public abstract extCountry(opts?: Options): string;

    public abstract street(opts?: Options): string;

    public abstract natural(opts?: Options): number;

    public abstract date(opts?: Chance.DateOptions): string;

    public abstract pickone<T>(arr: T[]): T;

    public abstract pickMultiple(enumType): number;

    public abstract pickOneEnum(enumType, optional?: boolean, except?: number[]): number;

    public abstract naturalOrNone(opts?: Options): number;

    public abstract rangeOrNone(opts?: Options): NumberRange;

    public abstract range(ops?: Options): NumberRange;

    public abstract stringOrNone(opts?: Options): string;

    public abstract integer(opts?: Options): number;
}
