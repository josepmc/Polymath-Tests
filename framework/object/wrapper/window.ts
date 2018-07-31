import { LocatorCompare, Locator, By } from '../../helpers';

export class WindowInfo {
    public windowHandle: string;
    public iframeStructure: Locator[];
    constructor(windowHandle?: string, iFrameStructure?: Locator[]) {
        this.windowHandle = windowHandle;
        this.iframeStructure = iFrameStructure;
    }

    public equals(that: WindowInfo): boolean {
        return this.windowHandle === that.windowHandle && WindowInfo.iframeStructureEquals(this.iframeStructure, that.iframeStructure);
    }
    public static equals(first: WindowInfo, second: WindowInfo): boolean {
        return !first ? first === second : first.equals(second);
    }
    public static iframeStructureEquals(first: Locator[], second: Locator[]): boolean {
        let equal = first.length === second.length;
        for (let i = 0; equal && i < first.length; ++i) {
            if (first && second && first['using'] !== second['using']) debugger; // We don't know how to compare a 'css' with an 'xpath' locator
            equal = equal && LocatorCompare(first[i] as Locator, second[i] as Locator);
        }
        return equal;
    }
}

export interface IWindow {

    /**
     * Opens a new window and switches the browser to that window
     * @returns {Promise<WindowInfo>} The previous open window
     *
     * @memberOf IWindow
     */
    open(): Promise<WindowInfo>;

    /**
     * Closes the current window and optionally returns to the previous window
     * @param {WindowInfo} oldHandle
     * @returns {Promise<void>}
     *
     * @memberOf IWindow
     */
    close(oldHandle?: WindowInfo): Promise<void>;

    /**
     * Waits for a new window to appear after calling {@link openFn}
     * @param {Function} openFn
     * @param {number} timeout
     * @returns {Promise<WindowInfo>} Information relating to the old window instance
     */
    waitForNewWindow(openFn: () => Promise<any>, timeout?: number): Promise<WindowInfo>;

    /**
     * Waits for the window to close after calling {@link closeFn}
     * @param {Function} closeFn
     * @param {WindowInfo} oldHandle
     * @param {number} timeout
     * @returns {Promise<void>}
     */
    waitForClose(closeFn: () => Promise<any>, oldHandle: WindowInfo, timeout?: number): Promise<void>;
}
