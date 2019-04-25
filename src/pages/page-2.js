/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { css } from 'emotion';

import Layout from '../components/layout';
import SEO from '../components/seo';
import { findCommand } from '../components/smart-app/commands';

const wire = (initialState, reducer = v => v) => function HOC(Component) {
  return function render(props) {
    const [state, setState] = useState(initialState);
    const updateFn = value => setState(reducer(state, value));
    return <Component state={state} update={updateFn} {...props} />;
  };
};

const initialState = {
  command: '',
};
const reducer = (state, action) => {
  switch (action.type) {
    case '[Command] Update':
      return { ...state, command: action.value };
    default:
      throw new Error(`invalid action type ${action.type}`);
  }
};

const CommandList = ({ commands = [] }) => (
  <div style={{
    background: '#f3f3f3',
    padding: '4px 8px',
  }}
  >
    {commands.map(({ command, highlight }) => {
      let content = command;
      if (highlight[0] !== highlight[1]) {
        const charList = command.split('');
        const replaceWith = command.substring(...highlight);
        const HighlightedFragment = <b key={command}>{replaceWith}</b>;
        const highlightLength = highlight[1] - highlight[0];
        charList.splice(highlight[0], highlightLength, HighlightedFragment);
        content = charList;
      }
      return (
        <div
          key={command}
          role="button"
          tabIndex={0}
          className={css`
            &:hover {
              color: #fff;
              background: blue;
            }
          `}
          onClick={() => {
            console.log(command);
          }}
        >
          {content}

        </div>
      );
    })}
  </div>
);

const WithState = wire(initialState, reducer)(({ state, update }) => (
  <div>
    <input
      type="text"
      value={state.command}
      placeholder="I'd like to..."
      className={css`
          background: "none";
          border: 1px solid #000;
          font-size: inherit;
          font-family: inherit;
          line-height: 1.4;
        `}
      onChange={(ev) => {
        const { value } = ev.target;
        update({
          type: '[Command] Update',
          value,
        });
      }}
    />
    <CommandList commands={findCommand(state.command)} />
  </div>
));

const mainStyle = `
  input {
    width: 100%;
    max-width: 100%;
    padding: 0.1em 0.4em;
  }
`;

function App() {
  return (
    <div
      className="App"
      style={{
        fontFamily: 'sans-serif',
      }}
    >
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: mainStyle }} />
      <h1>Smart Notes</h1>
      <WithState />
    </div>
  );
}

const SecondPage = () => (
  <Layout showHeader={false}>
    <SEO title="Page two" />
    <App />
  </Layout>
);

export default SecondPage;
