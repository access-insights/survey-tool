import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { LandingPage } from '../pages/LandingPage';
import { LoginPage } from '../pages/LoginPage';

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

afterEach(() => {
  cleanup();
});

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

  it('does not show header nav options on login page before sign in', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Layout>
          <LoginPage />
        </Layout>
      </MemoryRouter>
    );

    expect(screen.queryByRole('navigation', { name: /primary/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open navigation menu/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in to access insights survey tool/i })).toBeInTheDocument();
  });
});
