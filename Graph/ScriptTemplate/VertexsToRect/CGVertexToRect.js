const {BaseNode} = require('./BaseNode');
const Amaz = effect.Amaz;

class CGVertexToRect extends BaseNode {
  constructor() {
    super();
  }

  getOutput() {
    if (!this.inputs[0]) {
      return;
    }
    let bottomLeft = this.inputs[0]();
    if (!this.inputs[1]) {
      return;
    }
    let topRight = this.inputs[1]();

    if (topRight.x <= bottomLeft.x || topRight.y <= bottomLeft.y) {
      return;
    }
    return new Amaz.Rect(bottomLeft.x, bottomLeft.y, topRight.x - bottomLeft.x, topRight.y - bottomLeft.y);
  }
}

exports.CGVertexToRect = CGVertexToRect;
