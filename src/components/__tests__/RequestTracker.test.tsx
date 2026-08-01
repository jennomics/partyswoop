import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RequestTracker from '../guest/RequestTracker';

// Mock the useSSE hook
jest.mock('@/hooks/useSSE', () => ({
  useSSE: () => null,
}));

// Mock fetch for the polling behavior
global.fetch = jest.fn();

describe('RequestTracker', () => {
  const defaultProps = {
    guestCode: 'abc123',
    requestId: 'req-1',
    item: 'Coca-Cola',
    note: 'Extra cold please',
    category: 'DRINK',
  };

  it('renders three status steps (Sent, Seen, Done)', () => {
    render(<RequestTracker {...defaultProps} />);
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('Seen')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders the item name', () => {
    render(<RequestTracker {...defaultProps} />);
    expect(screen.getByText('Coca-Cola')).toBeInTheDocument();
  });

  it('renders the note when provided', () => {
    render(<RequestTracker {...defaultProps} />);
    expect(screen.getByText('Extra cold please')).toBeInTheDocument();
  });

  it('does not render a note when null', () => {
    render(<RequestTracker {...defaultProps} note={null} />);
    expect(screen.queryByText('Extra cold please')).not.toBeInTheDocument();
  });

  it('does not render any emoji', () => {
    const { container } = render(<RequestTracker {...defaultProps} />);
    const emojiPattern = /[\u{1F300}-\u{1F9FF}]/u;
    expect(emojiPattern.test(container.textContent || '')).toBe(false);
  });

  it('shows initial status message for NEW state', () => {
    render(<RequestTracker {...defaultProps} />);
    expect(screen.getByText('Your request has been sent to the host.')).toBeInTheDocument();
  });

  it('has progress tracker with step labels separated by rules', () => {
    const { container } = render(<RequestTracker {...defaultProps} />);

    // Verify rule lines exist between steps
    const ruleLines = container.querySelectorAll('.bg-rule');
    expect(ruleLines.length).toBeGreaterThan(0);

    // Verify step labels use mono font
    const sentLabel = screen.getByText('Sent');
    expect(sentLabel).toHaveClass('font-mono');
  });

  it('current step uses live color and future steps use ink-35', () => {
    const { container } = render(<RequestTracker {...defaultProps} />);

    // In NEW state, the first step (Sent) is current - it has text-live
    const sentLabel = screen.getByText('Sent');
    expect(sentLabel).toHaveClass('text-live');

    // The Seen and Done steps should be ink-35 (future steps)
    const seenLabel = screen.getByText('Seen');
    expect(seenLabel).toHaveClass('text-ink-35');

    const doneLabel = screen.getByText('Done');
    expect(doneLabel).toHaveClass('text-ink-35');
  });
});
