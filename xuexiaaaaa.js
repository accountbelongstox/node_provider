class Browser {
    constructor() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
    }
    getScrollOffsets() {
        return {
            x: window.pageXOffset,
            y: window.pageYOffset
        }
    }
    getViewportSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        }
    }
    getBrowserSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        }
    }
}