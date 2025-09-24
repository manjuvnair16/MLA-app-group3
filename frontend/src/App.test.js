import { render, screen } from '@testing-library/react';
import App from './App';

test('renders MLA Fitness App title', () => {
  render(<App />);
  const linkElement = screen.getByText("MLA Fitness App");
  expect(linkElement).toBeInTheDocument();
});
