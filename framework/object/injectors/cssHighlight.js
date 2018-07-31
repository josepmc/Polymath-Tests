module.exports = function cssHighlight() {
    /**
     * Source: http://www.phpied.com/dynamic-script-and-style-elements-in-ie/
     * Note that it's important for IE that you append the style to the head *before* setting its content. Otherwise IE678 will *crash* if the css string contains an @import.
     */
    const ss1 = document.createElement('style');
    const def = 'input[type=checkbox]:hover + label,input[type=checkbox]:focus + label, div[class*="button"]:hover, textarea:hover, select:hover, input:hover, button:hover, a:hover, img:hover, textarea:hover, *[style*="background: url"]:hover, div[style*="background-image: url"]:hover { background-color: #ec8a1d !important; box-shadow: 0px 0px 150px #000000 !important; z-index: 2 !important; -webkit-transition: all 200ms ease -in; -webkit-transform: scale(1.5); -ms-transition: all 200ms cubic-bezier(0.84, -0.23, 0, 2.31); -ms-transform: scale(2); -moz-transition: all 200ms cubic-bezier(0.84, -0.23, 0, 2.31); -moz-transform: scale(1.5); transition: all 2000ms cubic-bezier(0.84, -0.23, 0, 2.31) !important; transform: scale(2) !important; font-size: large !important; color: white !important; }';
    ss1.setAttribute('type', 'text/css');
    const hh1 = document.getElementsByTagName('head')[0];
    hh1.appendChild(ss1);
    if (ss1.styleSheet) { // IE
        ss1.styleSheet.cssText = def;
    }
    else { // the world
        const tt1 = document.createTextNode(def);
        ss1.appendChild(tt1);
    }
};
