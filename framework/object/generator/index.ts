export { DataGenerator } from './abstract';
export enum GeneratorBackend {
    Chance, Faker /* Not implemented */,
}
import { ChanceGenerator } from './chance';

export function GetGenerator(backend: GeneratorBackend) {
    switch (backend) {
        case GeneratorBackend.Chance:
            return ChanceGenerator;
        default:
            throw `Generator Backend: Error! Unknown backend or not implemented`;
    }
}
