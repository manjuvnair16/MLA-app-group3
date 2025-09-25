import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import Login from './login';
import { MemoryRouter } from 'react-router-dom';

jest.mock('axios');

it('renders login form', () => {
    render(
        <MemoryRouter>
            <Login onLogin={jest.fn()} />
        </MemoryRouter>
    );
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
});

it('calls onLogin on successful login', async () => {
    axios.post.mockResolvedValue({ status: 200 });
    const onLogin = jest.fn();
    render(
        <MemoryRouter>
            <Login onLogin={onLogin} />
        </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'username' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('username'));
});

it('shows error message on incorrect password', async () => {
    axios.post.mockRejectedValue({ response: { status: 401, data: 'Invalid credentials' } });
    render(
        <MemoryRouter>
            <Login onLogin={jest.fn()} />
        </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'username' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(screen.getByText(/username or password is incorrect/i)).toBeInTheDocument());
});