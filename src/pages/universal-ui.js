/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
/* eslint-disable quotes */
/* eslint-disable no-shadow */

/* TODO: add support for custom variable binding syntax parsing.
E.g. `#myProp` would be run through a converter function to get the actual value
by treating the `#` character as an Immutable property
*/
// TODO: handle event listener diffing to be removed when property no longer exists
// TODO: add support for variable bindings to element text

import React, { useEffect } from 'react';

import { DiffDOM, nodeToObj, stringToObj } from 'diff-dom';
import walkDOM from '../modules/walk-dom';
import Layout from '../components/layout';
import SEO from '../components/seo';

const makeId = (() => {
  let id = 0;
  return () => {
    id += 1;
    return id;
  };
})();

const createStore = (initialState = {}) => {
  let state = initialState;
  let oldState;
  let pendingListenerUpdate;
  const listeners = {};
  const triggerListeners = () => {
    Object.keys(listeners).forEach(id => listeners[id](state, oldState));
    pendingListenerUpdate = false;
  };
  // eslint-disable-next-line consistent-return
  const updateState = (changes = {}) => {
    if (typeof changes === 'function') {
      return updateState(changes(state));
    }
    oldState = state;
    state = { ...state, ...changes };

    if (!pendingListenerUpdate) {
      pendingListenerUpdate = true;
      requestAnimationFrame(triggerListeners);
    }
  };
  return {
    update: updateState,
    listen: (callback) => {
      const id = makeId();
      listeners[id] = callback;
      return function disconnect() {
        delete listeners[id];
      };
    },
    getState() {
      return state;
    },
  };
};

const context = createStore({
  show: true,
  count: 0,
  wheelChange: 0,
});

const props = {
  byId: new Map(),
  byFrag: {},
};

const parseArgs = (source) => {
  const sTrim = source.trim();
  const separator = ' ';
  let i = 0;
  let j = 0;
  const args = [];
  let isQuoted = false;
  while (i < sTrim.length) {
    const char = sTrim[i];

    if (!isQuoted) {
      const isArgEnd = char === separator;
      if (isArgEnd) {
        args.push(sTrim.substring(j, i));
        j = i + 1;
      }
      const isEndOfSource = i === sTrim.length - 1;
      if (isEndOfSource) {
        args.push(sTrim.substring(j));
        break;
      }
    }

    // handle quoted fragments
    const isQuote = char === "'" || char === '"';
    if (isQuoted && isQuote) {
      isQuoted = false;
      args.push(sTrim.substring(j, i + 1));
      i += 1;
      j = i + 1;
    } else if (!isQuoted && isQuote) {
      isQuoted = true;
    }

    i += 1;
  }
  return args;
};

const parsePropDefinition = def => def.match(/[:@][a-zA-Z\-0-9_\s"{}#]+/g)
  .map(parseArgs);

const getProps = changeId => props.byId.get(Number(changeId));

const updatePropDefinition = (frag) => {
  let id = props.byFrag[frag];
  // same id
  if (!id) {
    id = makeId();
  }
  const currentProps = props.byId.get(id);
  const nextProps = parsePropDefinition(
    frag,
  ).reduce((propsMap, prop) => {
    const [attrKey, ...args] = prop;
    const attrType = attrKey[0];
    const attrName = attrKey.substring(1);
    const isSimpleProp = attrType === ':';
    if (isSimpleProp) {
      const value = args[0];
      const isRawValue = value.charAt(0) === '"';
      const newValue = isRawValue ? value.substring(1, value.length - 1) : context.getState()[value];
      propsMap[attrName] = newValue;
    }
    const isEvent = attrType === '@';
    if (isEvent) {
      const handler = (ev) => {
        window.emit(ev, ...args);
      };
      propsMap[`on${attrName}`] = handler;
    }
    return propsMap;
  }, {});
  // compare props and generate new id if changes exist
  if (currentProps) {
    let changed = false;
    Object.keys(nextProps).forEach((p) => {
      const oVal = currentProps[p];
      const nVal = nextProps[p];
      const isDiffValue = oVal !== nVal;
      if (isDiffValue) {
        changed = true;
      }
    });
    if (changed) {
      // remove old id
      props.byId.delete(id);
      id = makeId();
    }
  }
  props.byId.set(id, nextProps);
  props.byFrag[frag] = id;

  return id;
};

const applyDOMProps = (node, props) => {
  // eslint-disable-next-line guard-for-in
  for (const key in props) {
    const isProp = typeof node[key] !== 'undefined';
    const val = props[key];
    if (isProp) {
      node[key] = val;
    } else {
      node.setAttribute(key, val);
    }
  }
};

const dd = new DiffDOM({
  // we don't need diffing of form element values since we're doing the property diffing ourself
  valueDiffing: false,
  // prevent removal of attributes
  preDiffApply(info) {
    const { action } = info.diff;
    const { node } = info;
    if (action === 'modifyAttribute' || action === 'removeAttribute') {
      const attrName = info.diff.name;
      if (attrName !== 'data-props') {
        const changeId = node.getAttribute('data-props');
        const propsObj = getProps(changeId);
        const shouldRemoveAttribute = propsObj && typeof propsObj[attrName] === 'undefined' && action === 'removeAttribute';
        if (shouldRemoveAttribute) {
          return false;
        }
        return true;
      }
    }
    return false;
  },
  postDiffApply(info) {
    const { action } = info.diff;
    const { node } = info;
    if (action === 'modifyAttribute' || action === 'removeAttribute') {
      // console.log(info.diff);
      if (info.diff.name === 'data-props') {
        const changeId = info.diff.newValue;
        const propsObj = getProps(changeId);
        applyDOMProps(node, propsObj);
      }
    } else if (action === 'addElement') {
      // initialize dom props for each newly added element to initialize things
      const applyNodeProps = (node) => {
        const isDOMElement = node.nodeType === 1;
        if (isDOMElement) {
          const changeId = node.getAttribute('data-props');
          if (changeId) {
            const propsObj = getProps(changeId);
            applyDOMProps(node, propsObj);
          }
        }
      };
      walkDOM(info.newNode, applyNodeProps);
    }
  },
});

const uiTemplate = count => `
  (div
    :class "foo bar")

    (ui-if
      :show "count"
      :data-count wheelChange)
    (/ui-if)

    (div)

      (input
        :type "checkbox"
        :checked show
      /)

      (input
        :type "number"
        :value wheelChange
        @input "setWheelChange"
      /)

      (button
        :type "button"
        @click "increment" 2
      )
        +${count}
      (/button)

    (/div)

    (div
      :class "with-children")(/div)

  (/div)
`;

window.emit = (ev, ...args) => {
  const trueValues = args.map((a) => {
    const isString = a.charAt(0) === '"';
    if (isString) {
      return a.substring(1, a.length - 1);
    }
    const asNum = Number(a);
    if (Number.isNaN(asNum)) {
      return context.getState()[a];
    }
    return asNum;
  });
  const [action] = trueValues;
  switch (action) {
    case 'increment': {
      context.update(state => ({
        count: state.count + 1,
      }));
      break;
    }
    case 'setWheelChange': {
      context.update({ wheelChange: ev.target.value });
      break;
    }
    default:
      console.warn(`no action type ${action}`);
      break;
  }
  // console.log(ev, trueValues);
};

const parseTemplate = (uiTemplate = '') => uiTemplate.replace(/\([\s]*[^]*?\)/g, frag => frag
  // tag open
  .replace(/\(/, '<')
  // tag close
  .replace(')', '>')
  // parse all attributes into a data object
  .replace(/[:@][^\\/\\>]+/g, (frag) => {
    const changeId = updatePropDefinition(frag);
    return `data-props="${changeId}"`;
  })).trim();

export default () => {
  useEffect(() => {
    const render = (() => {
      let prevVDOM;
      return (state) => {
        const elem = document.querySelector('#universal-ui');
        const vDOM1 = prevVDOM || nodeToObj(elem);
        const vDOM2 = stringToObj(`
          <div id="universal-ui">
            ${parseTemplate(uiTemplate(state.count))}
          </div>`);
        prevVDOM = vDOM2;
        const diff = dd.diff(vDOM1, vDOM2);
        dd.apply(elem, diff);
      };
    })();
    const unsubscribe = context.listen(render);
    context.update();
    return unsubscribe;
  });

  return (
    <Layout showHeader={false}>
      <SEO title="Page two" />
      <div id="universal-ui" />
    </Layout>
  );
};
