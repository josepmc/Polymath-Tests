export interface StoreObject<T> {
    value?: T;
}

export interface NumberRange {
    minimum: number;
    maximum?: number;
}

export interface SortedObject {
    keys: string[];
    values: string[];
}
