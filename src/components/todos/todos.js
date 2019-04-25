/* eslint-disable no-console */
import React, { useReducer, useEffect } from 'react';
import now from 'performance-now';
import propTypes from 'prop-types';
import Immutable from 'immutable';
import TodosDispatch from './context';
import './todo-styles.scss';
import TodoItem from './todo-item';

const makeId = () => now().toString(36);

const defaultTodoFormState = Immutable.Map({
  text: '',
});
const initialState = Immutable.Map({
  todoForm: defaultTodoFormState,
  items: Immutable.Map(),
  filterBy: 'completed',
});

const todosReducer = (state, action) => {
  switch (action.type) {
    case 'TODO_IN_PROGRESS': {
      return state.setIn(['todoForm', 'text'], action.text);
    }
    case 'TODO_FORM_RESET': {
      return state.set('todoForm', defaultTodoFormState);
    }
    case 'TODO_ADD': {
      const id = makeId();
      const newItem = {
        lastChanged: new Date().toISOString(),
        completed: false,
        description: state.getIn(['todoForm', 'text']),
      };
      return state.mergeIn(['items', id], newItem);
    }
    case 'TODO_SET': {
      const keypath = ['items', action.id];
      return state.mergeIn(keypath, action.changes)
        .setIn([...keypath, 'lastChanged'], new Date().toISOString());
    }
    case 'TODO_FILTER': {
      return state.set('filterBy', action.filterKey);
    }
    default:
      throw new Error(`invalid action type '${action.type}'`);
  }
};

const sortItemsBy = ({
  key = 'lastChanged',
  ascending = true,
}) => (a, b) => {
  const aVal = a.get(key);
  const bVal = b.get(key);
  if (ascending) {
    if (aVal < bVal) { return -1; }
    if (aVal > bVal) { return 1; }
  } else {
    if (aVal > bVal) { return -1; }
    if (aVal < bVal) { return 1; }
  }
  return 0;
};
const TodosList = React.memo(({ sortBy, items }) => (
  <ul
    style={{
      listStyle: 'none',
      margin: 0,
      padding: 0,
    }}
  >
    {items.sort(sortBy).entrySeq().map(([id, item]) => (
      <TodoItem key={id} id={id} data={item} />
    ))}
  </ul>
));

TodosList.propTypes = {
  items: propTypes.instanceOf(Immutable.Map).isRequired,
  sortBy: propTypes.func,
};

TodosList.defaultProps = {
  sortBy: sortItemsBy({ key: 'lastChanged', ascending: false }),
};

const loadTodos = (dispatch) => {
  new Array(5).fill(0).forEach(() => {
    const id = makeId();
    dispatch({
      type: 'TODO_SET',
      id,
      changes: {
        completed: true,
        description: `item ${id}`,
      },
    });
  });
};

const TodosApp = () => {
  // Note: `dispatch` won't change between re-renders
  const [state, dispatch] = useReducer(todosReducer, initialState);
  const addTodo = () => {
    dispatch({ type: 'TODO_ADD' });
    dispatch({ type: 'TODO_FORM_RESET' });
  };
  useEffect(() => {
    loadTodos(dispatch);
  }, [null]);
  return (
    <TodosDispatch.Provider value={{ state, dispatch }}>
      <div className="TodosApp">
        <h2>Todos</h2>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            addTodo();
          }}
        >
          <input
            type="text"
            value={state.getIn(['todoForm', 'text'])}
            onChange={(ev) => {
              dispatch({ type: 'TODO_IN_PROGRESS', text: ev.target.value });
            }}
          />
          <button onClick={addTodo} type="button">
            new item
          </button>
        </form>
        <TodosList items={state.get('items')} />
      </div>
    </TodosDispatch.Provider>
  );
};

export default TodosApp;
