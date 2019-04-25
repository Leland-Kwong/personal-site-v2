/* eslint-disable no-param-reassign */
const noop = () => {};

/**
* Recursively walk the DOM from a given root
* node, passing each node to an operator.
*
* @param {Node} node The root node.
* @param {Function} func The operator.
* @example
* walk(document.body, node => { //... })
*/
// eslint-disable-next-line no-underscore-dangle
function _walk(node, func) {
  if (func(node) !== false) {
    node = node.firstChild;
    while (node) {
      _walk(node, func);
      node = node.nextSibling;
    }
  }
}

/**
* Validate node on first pass only.
*/
function walk(node, func = noop) {
  if (node instanceof window.Node) {
    _walk(node, func);
  } else {
    throw new TypeError('walk: Expected a DOM node');
  }
  return node;
}

export default walk;
