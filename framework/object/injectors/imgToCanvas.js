// Convert an image to JS https://stackoverflow.com/questions/934012/get-image-data-in-javascript
module.exports = function getBase64Image(image, ext, windowKey, attribute) {
    // Create an empty canvas element
    // Avoid "Uncaught DOMException: Failed to execute 'toDataURL'
    // on 'HTMLCanvasElement': Tainted canvases may not be exported."
    delete window[windowKey];
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    for (let i = 0; i < attribute.length; ++i) {
        if (image[attribute[i]]) {
            img.src = image[attribute[i]];
            break;
        }
    }
    if (!img.src && image.style['background-image']) {
        const parse = (/url\(\"(.*)\"\)/).exec(image.style['background-image']);
        if (parse && parse.length === 2) {
            img.src = parse[1];
        }
    }
    if (!img.src) {
        throw String('ImgToCanvas - Error! Could not find the attribute where the img URL is stored! Image is: '
            + image);
    }
    img.onload = function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        // Copy the image contents to the canvas
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Get the data-URL formatted image
        // Firefox supports PNG and JPEG. You could check img.src to
        // guess the original format, but be aware the using "image/jpg"
        // will re-encode the image.
        window[windowKey] = canvas.toDataURL(ext, 1.0);
    };
};
