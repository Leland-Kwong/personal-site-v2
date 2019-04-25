/* eslint-disable prefer-destructuring */
// (tokenize source)[https://github.com/coderaiser/lisp/blob/master/lib/lexer/tokenize.js]

/** Lisp-style tokenizer */

// TODO: add support for record types?

const isString = str => typeof str === 'string';

function check(str) {
  if (!isString(str)) { throw Error('expression should be string!'); }
}

const regexp = /^\s*((\r|\n|$)|#;|#\||#\\[^\w]|#?(\(|\[|{)|\)|\]|}|'|`|,@|,|\+inf\.0|-inf\.0|\+nan\.0|"(\\(.|$)|[^"\\])*("|$)|[^\s()[\]{}]+)/;
function tokenize(expression) {
  check(expression);

  const tokens = [];
  const add = (array, token) => {
    tokens.push(token);

    return '';
  };

  let txt = expression.trim();

  while (txt) { txt = txt.replace(regexp, add); }

  return tokens;
}

const makeTabs = (depth) => {
  let tabs = '';
  for (let i = 0; i < depth; i += 1) {
    tabs += '\t';
  }
  return tabs;
};

const fnTypeNames = {
  DOMProp: 'domProp',
  DOMElement: 'domEl',
  customFuncContext: 'funcs',
};

const fnTypeValues = {
  DOMProp: name => (...args) => ({ type: 'attr', name, args }),
  // parses args and returns an html string representation of the element
  DOMElement: tagName => (...args) => args.reduce((vNode, directive) => {
    const { props, children } = vNode;
    const isAttr = typeof directive === 'object' && directive.type === 'attr';
    if (isAttr) {
      const { name: propName, args: attrArgs } = directive;
      if (propName === 'key') {
        // eslint-disable-next-line no-param-reassign
        vNode.key = attrArgs[0];
      } else {
        props[propName] = attrArgs;
      }
    } else {
      children.push(directive);
    }
    return vNode;
  }, {
    tagName,
    props: {},
    children: [],
  }),
};

const toFuncName = (token, funcContext, macroFuncContext) => {
  const isDOMProp = token.charAt(0) === ':';
  if (isDOMProp) {
    const propName = token.substring(1);
    return `${fnTypeNames.DOMProp}('${propName}')`;
  }
  if (macroFuncContext[token]) {
    return `macros['${token}']`;
  }
  return funcContext[token]
    // custom functions map context
    ? `${fnTypeNames.customFuncContext}['${token}']`
    : `${fnTypeNames.DOMElement}('${token}')`;
};

/*
  Rearranges tokens from lisp style to javascript style.
  Example:
    `(myFunc arg1 arg2)` transforms to `myFunc(arg1, arg2)`
*/
const toVDOMFunc = (tokens, funcContext, ctxName = 'ctx', macros = {}) => {
  let isNewGroup = false;
  let body = '';
  const ctx = ctxName;

  let depth = 0;
  while (tokens.length) {
    const t = tokens.shift();
    const firstChar = t.charAt(0);

    const groupStart = '(';
    const groupEnd = ')';
    const isGroupStart = t === groupStart;
    const isGroupEnd = t === groupEnd;

    if (isGroupStart && !isNewGroup) {
      isNewGroup = true;
    }
    const isFuncToken = !isGroupStart && isNewGroup;
    // first arg is a function call
    if (isFuncToken) {
      const macroFn = macros[t];
      const funcCall = toFuncName(t, funcContext, macros);
      isNewGroup = false;
      body += (`\n${makeTabs(depth)}${funcCall}( `);

      if (macroFn) {
        body += `\n${makeTabs(depth + 1)}${ctx},`;
      }

      depth += 1;
    // function arg
    } else if (!isGroupStart && !isGroupEnd) {
      const isVariable = (firstChar !== '"') && Number.isNaN(Number(t));
      let arg;
      if (isVariable) {
        if (t.indexOf(ctx) === 0) {
          arg = t;
        } else {
          /*
            Convert '.' keypath notation to bracket notation so we can
            handle various different key types.
          */
          const keypath = t.replace(/\.[0-9]+?/g, frag => `[${frag.substring(1)}]`);
          arg = `${ctx}.${keypath}`;
        }
      } else {
        arg = t;
      }
      const tabs = makeTabs(depth);
      body += (`\n${tabs}${arg},`);
    // function end
    } else if (isGroupEnd) {
      depth -= 1;
      const tabs = makeTabs(depth);
      const isLastToken = tokens.length === 0;
      const argSeparator = !isLastToken ? ',' : '';
      body += `\n${tabs}${groupEnd}${argSeparator}\n${tabs}`;
    }
  }

  const argNames = Object.values(fnTypeNames);
  // eslint-disable-next-line no-new-func
  const compiledFn = new Function(...argNames, ctx, 'macros', `return (${body});`);
  const fn = context => compiledFn(
    fnTypeValues.DOMProp,
    fnTypeValues.DOMElement,
    funcContext,
    context,
    macros,
  );
  fn.source = body;
  return fn;
};

const Immutable = require('immutable');


(() => {
  const customFuncs = {
    parse: (ctx) => {
      console.log(ctx);
    },
    str: (...strings) => strings.join(''),
    record: (...args) => {
      const obj = {};
      for (let i = 0; i < args.length; i += 2) {
        const k = args[i];
        const v = args[i + 1];
        obj[k] = v;
      }
      return obj;
    },
  };
  const context = {
    foo: 'FOO',
    bar: 'BAR',
    list: [1, 2],
    incrementBy: 1,
  };

  const expression = `
    (div
      (:randoProp (record
        "foo" foo
        "bar" bar))
      (:type "text")
      (:class foo bar list.0)
      (:key list.1)

      (button
        (:class "lorem-paragraph")
        (:click "increment" incrementBy 1.2)

        (str "text content" foo bar)
      )

      "div child"
    )
  `;
  const tokens = tokenize(expression);
  const createVDOM = toVDOMFunc(tokens, customFuncs);

  // const result = createVDOM(context);
  // console.log(createVDOM.source, result);
})();

(() => {
  const customFuncs = {
    immutableGet: (immutableObject, keypath) => {
      const path = keypath.split('.');
      return immutableObject.getIn(path);
    },
    List: immutableList => immutableList.toArray(),
  };
  const macros = {
    // shorthand for immutable path get
    '#': (ctx, path) => customFuncs.immutableGet(ctx, path),
  };
  const context = Immutable.fromJS({
    foo: {
      bar: 'bar',
    },
    list: [1, 2, 3],
  });
  const createVDOM = toVDOMFunc(
    tokenize(`
      (div (# "foo.bar")
        (custom-elem "a" "b")

        (ui-list
          (List (# "list")))
      )
    `),
    customFuncs,
    '$',
    macros,
  );
  const result = createVDOM(context);
  console.log(
    createVDOM.source,
    result,
  );
})();
