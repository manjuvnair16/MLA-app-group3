import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import Verify from './verify';
import { MemoryRouter } from 'react-router-dom';

jest.mock('axios');

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockedNavigate
}))

beforeEach(() => {
    Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '?token=test-jwt-token' }
    });
    render(
        <MemoryRouter>
            <Verify />
        </MemoryRouter>
    );
    mockedNavigate.mockClear();
});

it('renders verify text and button', () => {
    expect(screen.getByText(/Click the button below to verify your email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify/i })).toBeInTheDocument();
});

it('shows success message on successful verification', async () => {
    axios.get.mockResolvedValue({ status: 200 });
    fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
    await waitFor(() => expect(screen.getByText(/Email verified successfully/i)).toBeInTheDocument());
});

it('navigates to login when user clicks back to login', async () => {
    axios.get.mockResolvedValue({ status: 200 });

    fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
    await waitFor(() => expect(screen.getByText(/Email verified successfully/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Go to login/i }));
    expect(mockedNavigate).toHaveBeenCalledWith('/login');
})

it('shows error message on failed verification', async () => {
    axios.get.mockRejectedValue({
        response: {
            data: { message: 'Invalid or expired token' },
        },
    });
    fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
    await waitFor(() => expect(screen.getByText(/Verification failed: Invalid or expired token/i)).toBeInTheDocument());
});

it('shows error message when no token is provided', async () => {
    Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '' }
    });
    render(
        <MemoryRouter>
            <Verify />
        </MemoryRouter>
    );
    expect(screen.getByText(/No verification token provided/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to signup/i })).toBeInTheDocument();
});

it('navigates to signup when user clicks back to signup', async () => {
    Object.defineProperty(window, 'location', {
        writable: true,
        value: { search: '' }
    });
    render(
        <MemoryRouter>
            <Verify />
        </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Back to signup/i }));
    expect(mockedNavigate).toHaveBeenCalledWith('/signup');
})

it('shows message while verifying', async () => {
    let resolvePromise;
    axios.get.mockImplementation(() => new Promise((resolve) => {
        resolvePromise = resolve;
    }));

    fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
    expect(screen.getByText(/Verifying your email.../i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Verify/i })).not.toBeInTheDocument();
    
    resolvePromise({ status: 200 });
    await waitFor(() => expect(screen.getByText(/Email verified successfully/i)).toBeInTheDocument());
});