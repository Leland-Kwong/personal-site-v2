/* eslint-disable no-console */
import React, { useContext } from 'react';
import { Map } from 'immutable';
import propTypes from 'prop-types';
import TodosDispatch from './context';

const TodoItem = ({ id, data }) => {
  const { dispatch } = useContext(TodosDispatch);
  const done = data.get('completed');
  const TextField = (
    <input
      style={{
        textDecoration: done ? 'line-through' : null,
      }}
      className="TodosApp__Input"
      type="text"
      value={data.get('description')}
      onChange={(ev) => {
        dispatch({
          type: 'TODO_SET',
          id,
          changes: { description: ev.target.value },
        });
      }}
    />
  );
  const DoneToggle = (
    <label htmlFor={id} style={{ marginRight: 6 }}>
      <input
        id={id}
        type="checkbox"
        checked={done}
        onChange={() => {
          dispatch({
            type: 'TODO_SET',
            id,
            changes: { completed: !done },
          });
        }}
      />
    </label>
  );
  return (
    <li
      key={id}
      data-id={id}
    >
      {DoneToggle}
      {TextField}
      <small style={{ color: '#999' }}>{data.get('lastChanged')}</small>
    </li>
  );
};

TodoItem.propTypes = {
  id: propTypes.string.isRequired,
  data: propTypes.instanceOf(Map).isRequired,
};

export default TodoItem;
