import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ParticipantPage } from '../pages/ParticipantPage';

const mockParticipantLoad = vi.fn();
const mockParticipantSaveDraft = vi.fn();
const mockParticipantSubmit = vi.fn();

vi.mock('../lib/api', () => ({
  api: {
    participantLoad: (...args: unknown[]) => mockParticipantLoad(...args),
    participantSaveDraft: (...args: unknown[]) => mockParticipantSaveDraft(...args),
    participantSubmit: (...args: unknown[]) => mockParticipantSubmit(...args)
  }
}));

describe('ParticipantPage autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockParticipantLoad.mockReset();
    mockParticipantSaveDraft.mockReset();
    mockParticipantSubmit.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('loads draft answers and avoids repeated autosaves without value changes', async () => {
    mockParticipantLoad.mockResolvedValue({
      inviteId: 'invite-1',
      draftAnswers: { q1: 'Alice' },
      version: {
        id: 'v1',
        surveyId: 's1',
        version: 1,
        isPublished: true,
        title: 'Participant survey',
        description: 'desc',
        questions: [{ id: 'q1', label: 'Name', type: 'short_text', required: false }],
        createdAt: new Date().toISOString()
      }
    });
    mockParticipantSaveDraft.mockResolvedValue({ ok: true });

    render(
      <MemoryRouter initialEntries={['/participant/token-12345678901234567890']}>
        <Routes>
          <Route path="/participant/:inviteToken" element={<ParticipantPage />} />
        </Routes>
      </MemoryRouter>
    );

    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockParticipantLoad).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Participant survey' })).toBeInTheDocument();
    const input = screen.getByLabelText('Name') as HTMLInputElement;
    expect(input.value).toBe('Alice');

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockParticipantSaveDraft).toHaveBeenCalledTimes(1);
    expect(mockParticipantSaveDraft).toHaveBeenCalledWith('token-12345678901234567890', { q1: 'Alice' });

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(mockParticipantSaveDraft).toHaveBeenCalledTimes(1);

    fireEvent.change(input, { target: { value: 'Bob' } });

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(mockParticipantSaveDraft).toHaveBeenCalledTimes(2);
    expect(mockParticipantSaveDraft).toHaveBeenLastCalledWith('token-12345678901234567890', { q1: 'Bob' });
  });
});
