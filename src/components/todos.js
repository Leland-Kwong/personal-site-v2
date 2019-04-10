/* eslint-disable no-console */
import React, { useReducer } from 'react';
import now from 'performance-now';
import propTypes from 'prop-types';
import Immutable from 'immutable';

const TodosDispatch = React.createContext(null);

const makeId = () => now().toString(36);

const defaultTodoForm = Immutable.Map({
  text: '',
});
const initialState = Immutable.Map({
  todoForm: defaultTodoForm,
  items: Immutable.Map(),
});

const todosReducer = (state, action) => {
  switch (action.type) {
    case 'TODO_IN_PROGRESS': {
      return state.setIn(['todoForm', 'text'], action.text);
    }
    case 'TODO_ADD': {
      const id = makeId();
      const newItem = {
        description: state.getIn(['todoForm', 'text']),
      };
      return state.setIn(['items', id], newItem);
    }
    default:
      throw new Error(`invalid action type '${action.type}'`);
  }
};

const TodosList = React.memo(({ items }) => {
  console.log('render todos-list');
  return (
    <ul>
      {items.entrySeq().map(([id, item]) => (
        <li key={id}>{item.description}</li>
      ))}
    </ul>
  );
});

TodosList.propTypes = {
  items: propTypes.instanceOf(Immutable.Map).isRequired,
};

const TodosApp = () => {
  // Note: `dispatch` won't change between re-renders
  const [todos, dispatch] = useReducer(todosReducer, initialState);
  const addTodo = () => {
    dispatch({ type: 'TODO_ADD' });
    dispatch({ type: 'TODO_IN_PROGRESS', text: '' });
  };
  return (
    <TodosDispatch.Provider value={dispatch}>
      <div>
        <h2>Todos</h2>
        <form onSubmit={(ev) => {
          ev.preventDefault();
          addTodo();
        }}
        >
          <input
            type="text"
            value={todos.getIn(['todoForm', 'text'])}
            onChange={(ev) => {
              dispatch({ type: 'TODO_IN_PROGRESS', text: ev.target.value });
            }}
          />
          <button
            onClick={addTodo}
            type="button"
          >
          new item
          </button>
        </form>
        <TodosList items={todos.get('items')} />
      </div>
    </TodosDispatch.Provider>
  );
};

export default TodosApp;
