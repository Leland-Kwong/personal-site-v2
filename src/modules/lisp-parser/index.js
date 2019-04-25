// (tokenize source)[https://github.com/coderaiser/lisp/blob/master/lib/lexer/tokenize.js]

/** Lisp-style tokenizer */

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

  let txt = expression;

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
  DOMAttribute: 'domAttr',
  DOMElement: 'domEl',
  customFuncContext: 'funcs',
};

const makeId = (() => {
  let id = 0;
  return () => {
    id += 1;
    return id;
  };
})();

const propsById = {};

const fnTypeValues = {
  DOMAttribute: name => (...args) => ({ type: 'attr', name, args }),
  // parses args and returns an html string representation of the element
  DOMElement: (tagName, indentationDepth, options = {}) => (...args) => {
    const { pretty } = options;
    const propsId = makeId();
    propsById[propsId] = {};
    return args.reduce((html, directive, i) => {
      const isAttr = typeof directive === 'object' && directive.type === 'attr';
      if (isAttr) {
        const { name: attrName, args: attrArgs } = directive;
        propsById[propsId][attrName] = attrArgs;
        // inner html content
      } else {
        const tabs = (pretty && i === 2) ? makeTabs(indentationDepth + 1) : '';
        // eslint-disable-next-line no-param-reassign
        html += `${tabs}${directive}`;
      }
      const isLast = i === args.length - 1;
      if (isLast) {
        const tabs = pretty ? makeTabs(indentationDepth) : '';
        return `
${tabs}<${tagName} data-props="${propsId}">
${html}
${tabs}</${tagName}>
        `.trim();
      }
      return html;
    }, '');
  },
};

const toFuncName = (token, funcContext, indentationDepth, options) => {
  const isDOMAttr = token.charAt(0) === ':';
  if (isDOMAttr) {
    const attrName = token.substring(1);
    return `${fnTypeNames.DOMAttribute}('${attrName}')`;
  }
  const opts = options ? JSON.stringify(options) : '';
  return funcContext[token]
    // custom functions map context
    ? `${fnTypeNames.customFuncContext}['${token}']`
    : `${fnTypeNames.DOMElement}('${token}', ${indentationDepth}, ${opts})`;
};

/*
  Rearranges tokens from lisp style to javascript style.
  Example:
    `(myFunc arg1 arg2)` transforms to `myFunc(arg1, arg2)`
*/
const parenthesize = (tokens, funcContext, options) => {
  let isNewGroup = false;
  let body = '';

  let depth = 0;
  while (tokens.length) {
    const t = tokens.shift();

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
      const funcCall = toFuncName(t, funcContext, depth, options);
      isNewGroup = false;
      body += (`\n${makeTabs(depth)}${funcCall}( `);
      depth += 1;
    // function arg
    } else if (!isGroupStart && !isGroupEnd) {
      const isVariable = (t.charAt(0) !== '"') && Number.isNaN(Number(t));
      let arg;
      if (isVariable) {
        const keypath = t.replace(/\.[0-9]+?/g, frag => `[${frag.substring(1)}]`);
        arg = `ctx.${keypath}`;
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
  return new Function(...argNames, 'ctx', `return (${body});`);
};

const customFuncs = {
  parse: () => {},
  // get property from immutable
  '#': () => {},
  str: (...strings) => strings.join(''),
};

const context = {
  foo: 'FOO',
  bar: 'BAR',
  list: [1, 2],
  incrementBy: 1,
};

const expression = `
  (div
    (:type "text")
    (:class foo bar list.0)

    (button
      (:class "lorem-paragraph")
      (:click "increment" incrementBy 1.2)

      (str "text content." foo bar)
    )
  )
`.trim();

const tokens = tokenize(expression);
const uiTemplate = parenthesize(tokens, customFuncs, { pretty: true });
// console.log(uiTemplate);
const result = uiTemplate(
  fnTypeValues.DOMAttribute,
  fnTypeValues.DOMElement,
  customFuncs,
  context,
);

console.log(result);

// Object.entries(propsById).forEach(([k, v]) => {
//   console.log(k, v);
// });
