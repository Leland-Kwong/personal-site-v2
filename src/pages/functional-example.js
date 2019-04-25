/* eslint-disable react/prop-types */
/* eslint-disable no-param-reassign */
import React, { useReducer, useState, useEffect } from 'react';
import propTypes from 'prop-types';
import produce from 'immer';
import axios from 'axios';
import { of, from, Subject } from 'rxjs';
import { switchMap, distinctUntilChanged } from 'rxjs/operators';

import Layout from '../components/layout';
import SEO from '../components/seo';

const Async = ({ children: Child, input, observer }) => {
  const [state, setState] = useState(null);
  useEffect(() => {
    const getState = () => state;
    return observer(input, setState, getState);
  }, [input]);
  return state === null ? null : Child(state);
};

Async.propTypes = {
  children: propTypes.func,
  observer: propTypes.func.isRequired,
};

const sortBy = (sortKey, direction = 1) => (a, b) => {
  if (a[sortKey] === b[sortKey]) {
    return 0;
  }
  return (a[sortKey] < b[sortKey] ? -1 : 1) * direction;
};
const Todos = {
  newList() {
    return { items: [] };
  },
  addItem(entity, itemData) {
    return produce(entity, (draft) => {
      draft.items.push({
        id: performance.now(),
        title: '',
        done: false,
        ...itemData,
      });
    });
  },
  updateItem(entity, item, changes = {}) {
    return produce(entity, (draft) => {
      const { items } = draft;
      const index = items.findIndex(itemA => itemA.id === item.id);
      Object.assign(items[index], changes);
    });
  },
  deleteItem(entity, item) {
    return produce(entity, (draft) => {
      const { items } = draft;
      const index = items.findIndex(itemA => itemA.id === item.id);
      delete items[index];
    });
  },
  sortBy(entity, sortFn = sortBy('title')) {
    return produce(entity, (draft) => {
      draft.items.sort(sortFn);
    });
  },
};

const reduceFuncs = (result, fn) => fn(result);
const reduce = (ops, seed) => {
  const hasSeed = typeof seed !== 'undefined';
  return hasSeed
    ? ops.reduce(reduceFuncs, seed)
    : v => reduce(ops, v);
};

const todosReduced = reduce([
  list => Todos.addItem(list, {
    title: 'item 2',
    done: false,
  }),
  list => Todos.addItem(list, {
    title: 'item 1',
    done: false,
  }),
  list => Todos.updateItem(list, list.items[1], { done: !list.items[1].done }),
  list => Todos.sortBy(list),
])(Todos.newList());

const todoList1 = Todos.addItem(Todos.newList(), {
  title: 'item 1',
  done: false,
});
const todoList2 = Todos.addItem(todoList1, { title: 'item 2' });

const reducer = produce((state, action) => {
  switch (action.type) {
    case '[Todos] Update Item': {
      return {
        ...state,
        todoList: Todos.updateItem(state.todoList, action.item, action.changes),
      };
    }
    case '[Todos] Delete Item': {
      return {
        ...state,
        todoList: Todos.deleteItem(state.todoList, action.item),
      };
    }
    case '[Async] Change ItemId': {
      return { ...state, asyncItemId: action.itemId };
    }
    default:
      break;
  }
});

const initialState = {
  todoList: todoList2,
  asyncItemId: '',
};

const WithAsyncData = ({ itemId = '' }) => (
  <Async
    input={`https://jsonplaceholder.typicode.com/todos/${itemId}`}
    observer={(query, update) => {
      let cancelled = false;
      axios.get(query, {
        validateStatus(status) {
          return status <= 200; // accept only if status is less than 200
        },
      }).then(({ data }) => ({
        error: null,
        result: Array.isArray(data) ? data : [data],
      })).catch(error => ({ error, result: [] }))
        .then((res) => {
          if (cancelled) {
            return;
          }
          update(res);
        });
      return () => {
        cancelled = true;
      };
    }}
  >
    {response => (
      <ul>
        {response.result.slice(0, 4).map(item => <li key={item.id}>{item.title}</li>)}
      </ul>
    )}
  </Async>
);

const SecondPage = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const todosSorted = Todos.sortBy(state.todoList, sortBy('title', -1));
  return (
    <Layout showHeader={false}>
      <SEO title="Composition" />
      <input
        type="number"
        onChange={(ev) => {
          dispatch({
            type: '[Async] Change ItemId',
            itemId: ev.target.value,
          });
        }}
      />
      <WithAsyncData itemId={state.asyncItemId} />
      {todosSorted.items.map(item => (
        <li key={item.id}>
          <input
            type="checkbox"
            checked={item.done}
            onChange={() => dispatch({
              type: '[Todos] Update Item',
              item,
              changes: {
                done: !item.done,
              },
            })}
          />
          <input
            type="text"
            value={item.title}
            onChange={ev => dispatch({
              type: '[Todos] Update Item',
              item,
              changes: {
                title: ev.target.value,
              },
            })}
          />
          <button
            type="button"
            onClick={() => dispatch({
              type: '[Todos] Delete Item',
              item,
            })}
          >
archive

          </button>
        </li>
      ))}
    </Layout>
  );
};
export default SecondPage;
