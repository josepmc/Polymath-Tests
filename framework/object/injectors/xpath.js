module.exports = function absoluteXPath(element) {
    let comp;
    const comps = [];
    let xpath = '';
    const getPos = function(elPos) {
        let position = 1;
        let curNode;
        if (elPos.nodeType === Node.ATTRIBUTE_NODE) {
            return null;
        }
        for (curNode = elPos.previousSibling; curNode; curNode = curNode.previousSibling) {
            if (curNode.nodeName === elPos.nodeName) {
                ++position;
            }
        }
        return position;
    };

    if (element instanceof Document) {
        return '/';
    }

    for (; element && !(element instanceof Document); element = element.nodeType ===
                Node.ATTRIBUTE_NODE ? element.ownerElement : element.parentNode) {
        comp = comps[comps.length] = {};
        switch (element.nodeType) {
        case Node.TEXT_NODE:
            comp.name = 'text()';
            break;
        case Node.ATTRIBUTE_NODE:
            comp.name = '@' + element.nodeName;
            break;
        case Node.PROCESSING_INSTRUCTION_NODE:
            comp.name = 'processing-instruction()';
            break;
        case Node.COMMENT_NODE:
            comp.name = 'comment()';
            break;
        case Node.ELEMENT_NODE:
            comp.name = element.nodeName;
            break;
        }
        comp.position = getPos(element);
    }

    for (let i = comps.length - 1; i >= 0; i--) {
        comp = comps[i];
        xpath = xpath + '/' + comp.name.toLowerCase();
        if (comp.position !== null) {
            xpath = xpath + '[' + comp.position + ']';
        }
    }
    return xpath;
};
