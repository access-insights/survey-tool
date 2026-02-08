import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '../pages/LandingPage';

vi.mock('../lib/auth', () => ({
  useAuth: () => ({
    profile: null,
    loading: false,
    login: async () => undefined,
    logout: async () => undefined,
    refreshProfile: async () => undefined,
    token: null
  })
}));

describe('a11y smoke checks', () => {
  it('renders a single clear login action', () => {
    render(
      <MemoryRouter>
        <main>
          <LandingPage />
        </main>
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /log in to access insights survey tool/i })).toBeInTheDocument();
  });
});
