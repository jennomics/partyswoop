import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorMessage from '../ui/ErrorMessage';

describe('ErrorMessage', () => {
  it('renders the error text', () => {
    render(<ErrorMessage message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('has role="alert" for accessibility', () => {
    render(<ErrorMessage message="Error occurred" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('is styled with red colors for visibility', () => {
    const { container } = render(<ErrorMessage message="Error occurred" />);
    const alertDiv = container.querySelector('[role="alert"]');
    expect(alertDiv).toHaveClass('bg-red-50');
    expect(alertDiv).toHaveClass('border-red-200');
    expect(alertDiv).toHaveClass('text-red-800');
  });

  it('renders nothing when message is empty', () => {
    const { container } = render(<ErrorMessage message="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders dismiss button when onDismiss is provided', () => {
    const onDismiss = jest.fn();
    render(<ErrorMessage message="Error" onDismiss={onDismiss} />);
    const button = screen.getByLabelText('Dismiss error');
    expect(button).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(<ErrorMessage message="Error" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText('Dismiss error'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not render dismiss button when onDismiss is not provided', () => {
    render(<ErrorMessage message="Error" />);
    expect(screen.queryByLabelText('Dismiss error')).not.toBeInTheDocument();
  });
});
