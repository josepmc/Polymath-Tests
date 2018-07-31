import { Locator } from "../helpers";

export const LocatorCompare = (first: Locator, second: Locator): boolean => {
    return (first === null && second === null)
        || (first !== null && second != null && first.toString() === second.toString());
};
