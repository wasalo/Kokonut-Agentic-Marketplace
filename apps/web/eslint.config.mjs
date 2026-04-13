import nextVitals from 'eslint-config-next';

const config = [
  ...nextVitals,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/static-components': 'off',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
    },
  },
];

export default config;
