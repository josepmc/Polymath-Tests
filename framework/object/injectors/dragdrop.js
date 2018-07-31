// Based on the comments from https://gist.github.com/druska/624501b7209a74040175
module.exports = function simulateDragDrop(sourceNode, destinationNode) {
    const EVENT_TYPES = {
        DRAG_END: 'dragend',
        DRAG_START: 'dragstart',
        DROP: 'drop',
    };

    function createCustomEvent(eventType) {
        const event = document.createEvent('CustomEvent');
        event.initCustomEvent(eventType, true, true, null);
        event.dataTransfer = {
            data: {
            },
            setData: function(type, val) {
                this.data[type] = val;
            },
            getData: function(type) {
                return this.data[type];
            },
            dropEffect: 'move',
        };
        return event;
    }

    function dispatchEvent(node, type, event) {
        if (node.dispatchEvent) {
            return node.dispatchEvent(event);
        }
        if (node.fireEvent) {
            return node.fireEvent('on' + type, event);
        }
        return null;
    }

    const event = createCustomEvent(EVENT_TYPES.DRAG_START);
    dispatchEvent(sourceNode, EVENT_TYPES.DRAG_START, event);

    const dropEvent = createCustomEvent(EVENT_TYPES.DROP);
    dropEvent.dataTransfer = event.dataTransfer;
    dispatchEvent(destinationNode, EVENT_TYPES.DROP, dropEvent);

    const dragEndEvent = createCustomEvent(EVENT_TYPES.DRAG_END);
    dragEndEvent.dataTransfer = event.dataTransfer;
    dispatchEvent(sourceNode, EVENT_TYPES.DRAG_END, dragEndEvent);
};
