import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import Login from './login';
import { MemoryRouter } from 'react-router-dom';

jest.mock('axios');
let onLogin;

beforeEach(() => {
    onLogin = jest.fn();
    render(
        <MemoryRouter>
            <Login onLogin={onLogin} />
        </MemoryRouter>
    );
});

it('renders login form', () => {
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Login/i })).toBeInTheDocument();
});

it('calls onLogin on successful login', async () => {
    axios.post.mockResolvedValue({ 
        status: 200, 
        data: { jwt: 'test-jwt'} 
    });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith('test@test.com'));
});

it('shows error message on incorrect password', async () => {
    axios.post.mockRejectedValue({ 
        response: { 
            status: 401, 
            data: { message: 'Email or password is incorrect - please try again' } 
        } 
    });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByRole('button', { name: /Login/i }));

    await waitFor(() => expect(screen.getByText(/Email or password is incorrect - please try again/i)).toBeInTheDocument());
});