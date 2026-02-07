import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../lib/theme';
import { AccessibilityPage } from '../pages/AccessibilityPage';

describe('a11y smoke checks', () => {
  it('renders accessibility statement with key landmarks', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <main>
            <AccessibilityPage />
          </main>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /accessibility statement/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /accessibility@accessinsights.org/i })).toBeInTheDocument();
  });
});
