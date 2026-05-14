import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the ChatFlow login screen', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /chatflow/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
});
