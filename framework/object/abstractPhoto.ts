import * as fs from 'fs';
import * as gm from 'gm';
import { assert, oh, tmpFile } from '../helpers';
import mime = require('mime-types');
import * as path from 'path';
import { ElementFinder, WebElement } from 'protractor';
const imgToCanvas = require('./injectors/imgToCanvas');
const xpath = require('./injectors/xpath');

export class Size {
  public height: number;
  public width: number;
  public extension: string;
  constructor(obj: { height?: string | number, width?: string | number, extension?: string }) {
    this.height = Number.parseInt(obj.height + '');
    this.width = Number.parseInt(obj.width + '');
    this.extension = obj.extension ? mime.lookup(obj.extension) || obj.extension : 'image/png';
  }
  public valueOf() {
    return this.width + this.height;
  }
  public toString() {
    return `${this.height}x${this.width}:${this.extension}`;
  }
  public equals(other: Size) {
    if (!other) {
      console.log('Other is null');
      debugger;
    }
    return this.width === other.width && this.height === other.height;
  }
}

export interface PhotoOptions {
  tryMultiple?: boolean;
  attribute?: string[];
}

export abstract class AbstractPhoto {
  // Let's put it in cache to avoid stallness problems
  protected internalBuffer: Buffer;
  public element: WebElement;
  protected async getElementHTML(): Promise<string> {
    return this.element ? await oh.html(this.element) : null;
  }
  public abstract async size(force?: boolean): Promise<Size>;
  public async canvas(force: boolean = false): Promise<Buffer> {
    return this.internalBuffer && !force ? this.internalBuffer :
      (this.internalBuffer = await this.createCanvas(await this.internalCanvas(force), await this.size(force)));
  }
  protected async getImageSize(canvas: WebElement, opts: PhotoOptions = { tryMultiple: true }): Promise<Size> {
    //let size = await canvas.getSize(); // doesn't return the real value...
    let defaultExtension = 'image/png';
    let newSize: Size = null;
    // Sometimes this will fail...
    for (let i = 0; i < 10 && !newSize; ++i) {
      // Canvas may need to be recreated in certain conditions
      let createdCanvas = await this.createCanvas(canvas, new Size({ extension: defaultExtension }), opts);
      newSize = await new Promise<Size>(async (resolve, reject) => {
        return gm(createdCanvas).size((err, value) => {
          if (err) {
            console.log(`Error: An error ocurred while rotating an image internally ${err}`);
            resolve(null);
          } else resolve(new Size({ width: value.width, height: value.height, extension: defaultExtension }));
        });
      });
      if (!opts.tryMultiple) break;
    }
    //assert.isNotNull(newSize, `Error: Couldn't get the canvas size after multiple attempts.`);
    return newSize;
  }

  public async prepare(): Promise<this> {
    await this.size();
    await this.canvas();
    return this;
  }

  constructor(photo: WebElement) {
    this.element = photo;
  }

  public equal(target: AbstractPhoto): Promise<boolean> {
    return AbstractPhoto.photoEquals(this, target);
  }

  public equals(target: AbstractPhoto): Promise<boolean> {
    return AbstractPhoto.photoEquals(this, target);
  }

  public async uid(): Promise<string> {
    return await oh.html(this.element);
  }

  public async getElementXPath(): Promise<string> {
    return this.element ? await oh.browser.executeScript(xpath, this.element) + '' : null;
  }

  protected async internalCanvas(force?: boolean): Promise<WebElement> {
    return this.element;
  }

  protected async createCanvas(canvas: WebElement, size: Size, opts: PhotoOptions = { tryMultiple: true }): Promise<Buffer> {
    // Do NOT use oh.browser.driver.executeScript --> It'll block the execution
    switch (await canvas.getTagName()) {
      case 'canvas':
        return await oh.browser.executeScript(`return arguments[0].toDataURL('${size.extension}', 1.0);`, canvas)
          .then(imageUrl => {
            return Buffer.from(imageUrl.toString().replace(/^data:image\/(png|gif|jpeg);base64,/, ''), 'base64');
          });
      case 'img': let key = `testFunnelUploadedPhotosVar`;
        // Do NOT use oh.browser.driver.executeScript --> It'll block the execution
        // As this is an image, we need to create a canvas on top of it
        let imageUrl = await new Promise<string>(async (resolve, reject) => {
          await oh.browser.executeScript(imgToCanvas, canvas, size.extension, key, opts.attribute || ['src']);
          let imageUrl = '';
          if (opts.tryMultiple)
            imageUrl += await oh.wait(async () => { return await oh.browser.executeScript(`return window['${key}'];`); },
              `Timeout: Couldn't obtain canvas from uploaded photo`);
          else imageUrl += await oh.browser.executeScript(`return window['${key}'];`);
          resolve(imageUrl + '');
        });
        return Buffer.from(imageUrl.toString().replace(/^data:image\/(png|gif|jpeg);base64,/, ''), 'base64');
      default:
        throw `Error: Unknown image type, not implemented`;
    }
  }

  protected static async rotate(photo: AbstractPhoto, degrees: number): Promise<Buffer> {
    return await new Promise<Buffer>(async (resolve, reject) => { // Without setting the color, it won't rotate
      return gm(await photo.canvas(), (await photo.size()).extension).rotate('transparent', degrees).toBuffer((err, buf) => {
        assert(!err, `Error: An error ocurred while rotating an image internally ${err}`);
        resolve(buf);
      });
    });
  }

  protected static async resize(photo: AbstractPhoto, targetSize: Size): Promise<Buffer> {
    return await new Promise<Buffer>(async (resolve, reject) => {
      let buffer = await photo.canvas();
      let ext = await (await photo.size()).extension;
      //setFormat(targetSize.extension) will yield and empty buffer, hence we can't change the format... - may affect comparison
      return gm(buffer, ext).filter('lanczos').
        resize(targetSize.width, targetSize.height, '!').toBuffer((err, buf) => {
          assert(!err, `Error: Converting image ${photo} for comparison failed ${err}`);
          resolve(buf);
        });
    });
  }

  protected static async compareCanvas(aPhoto: AbstractPhoto, bPhoto: AbstractPhoto): Promise<boolean> {
    let aFile = tmpFile({ postfix: '.' + mime.extension((await aPhoto.size()).extension) });
    fs.writeFileSync(aFile, await aPhoto.canvas());
    let bFile = tmpFile({ postfix: '.' + mime.extension((await bPhoto.size()).extension) });
    fs.writeFileSync(bFile, await bPhoto.canvas());
    return await new Promise<boolean>(async (resolve, reject) => {
      return gm.compare(aFile, bFile, { tolerance: 0.4 }, (err, isEqual, equality, raw) => {
        fs.unlinkSync(aFile);
        fs.unlinkSync(bFile);
        assert(!err, `Error: Comparing ${aPhoto} with ${bPhoto} failed ${err}`);
        // 5% difference margin
        resolve(equality < 0.05);
      });
    });
  }

  public static async photoEquals(origin: AbstractPhoto, target: AbstractPhoto): Promise<boolean> {
    let result: boolean = true;
    let originSize = await origin.size();
    let targetSize = await target.size();
    if (originSize.equals(targetSize)) result = await this.compareCanvas(origin, target);
    else {
      let minimum: AbstractPhoto, toResize: AbstractPhoto;
      if (originSize < targetSize) {
        minimum = origin;
        toResize = target;
      } else {
        minimum = target;
        toResize = origin;
        originSize = targetSize;
      }
      let resizedCanvas = await AbstractPhoto.resize(toResize, originSize);
      let toCompare = await SimplePhoto.create(resizedCanvas, originSize);
      // We can't compare the buffers directly
      result = result && await this.compareCanvas(minimum, toCompare);
    }
    // I don't think we should compare the elements at all
    /*if (result && origin.element && target.element) {
      result = result && origin.getElementHTML() === target.getElementHTML();
    }*/
    return result;
  }
}

export class NoPhoto extends AbstractPhoto {
  public size(force?: boolean): Promise<Size> {
    throw new Size({});
  }
  public async equals(other: AbstractPhoto): Promise<boolean> {
    return other instanceof NoPhoto;
  }
  constructor() { super(null); this.internalBuffer = new Buffer(''); }
}

export class SimplePhoto extends AbstractPhoto {
  private innerSize: Size;
  private innerBuffer: Buffer;
  private constructor() {
    super(null);
  }

  private async init(content: Buffer | String | WebElement, size: Size = null, opts: PhotoOptions = { tryMultiple: true }): Promise<SimplePhoto> {
    if (content instanceof Promise) content = await content;
    if (content instanceof ElementFinder) content = await content.getWebElement();
    if (content instanceof WebElement) {
      this.element = content;
      this.innerSize = size || await this.getImageSize(content, opts);
    } else {
      let extension = 'image/png';
      if (content instanceof Buffer) {
        this.innerBuffer = content;
      } else if (!(content instanceof WebElement)) {
        let target = content.toString();
        extension = path.extname(target);
        assert(fs.existsSync(target), `Provided photo path doesn't exist ${target}`);
        this.innerBuffer = await new Promise<Buffer>((resolve, reject) => {
          return gm(path.resolve(target)).toBuffer((err, buf) => {
            assert(!err, `Error: An error ocurred while reading the image ${target}: ${err}`);
            resolve(buf);
          });
        });
      }
      this.innerSize = size || await new Promise<Size>((resolve, reject) => {
        return gm(this.innerBuffer).size((err, dimensions) => {
          assert(!err, `Error: An error ocurred while finding out the dimensions of the image ${content}: ${err}`);
          resolve(new Size({ extension: extension, height: dimensions.height, width: dimensions.width }));
        });
      });
    }
    return this;
  }

  public static create(content: Buffer | String | WebElement, size: Size = null, opts: PhotoOptions = { tryMultiple: true }): Promise<SimplePhoto> {
    return new SimplePhoto().init(content, size, opts);
  }

  public async canvas(): Promise<Buffer> {
    return this.element ? await super.canvas() : this.innerBuffer;
  }

  public async size(): Promise<Size> {
    return this.innerSize;
  }
}
