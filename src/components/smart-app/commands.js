const commandList = [
  ...[
    'new task',
    'mark task',
    'archive task',
  ],
  ...[
    'new note',
    'archive note',
  ],
];

// eslint-disable-next-line import/prefer-default-export
export const findCommand = query => commandList.reduce((results, cmd) => {
  const score1 = cmd.match(new RegExp(`^${query}`, 'i'));
  if (score1) {
    // console.log(score1, query.length);
    results.push({
      score: 1,
      command: cmd,
      highlight: [score1.index, Math.max(0, score1.index + query.length)],
    });
    return results;
  }
  const score2 = cmd.match(new RegExp(query, 'i'));
  if (score2) {
    // console.log(score2);
    results.push({
      score: 2,
      command: cmd,
      highlight: [score2.index, Math.max(0, score2.index + query.length)],
    });
    return results;
  }
  return results;
}, []).sort((a, b) => {
  const key = 'score';
  const aVal = a[key];
  const bVal = b[key];
  if (aVal === bVal) {
    return 0;
  }
  return aVal < bVal ? -1 : 1;
});
