module.export = {
  verbose: true,
  testPathIgnorePatterns: ['/node_modules/', '/cache/', '/docs/', '/examples/'],
  transform: {
    '^.+\\.[t|j]s?$': 'babel-jest',
  },
};
