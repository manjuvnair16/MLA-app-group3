import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import Signup from './signup';
import { MemoryRouter } from 'react-router-dom';

jest.mock('axios');

beforeEach(() => {
    render(
        <MemoryRouter>
            <Signup />
        </MemoryRouter>
    );
});

it('renders signup form', () => {
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Signup/i })).toBeInTheDocument();
});

it('shows "submitted" UI on successful signup', async () => {
    axios.post.mockResolvedValue({ 
        status: 200, 
        data: { message: "User registered successfully! Please check your email to verify your account before logging in."} 
    });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'password' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Signup/i }));

    await waitFor(() => { 
        expect(screen.getByText(/Thanks for signing up!/i)).toBeInTheDocument();
        expect(screen.getByText(/We have sent a verification link to:/i)).toBeInTheDocument();
    });

    expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8080/api/auth/signup',
        {
            email: 'test@test.com',
            firstName: 'John',
            lastName: 'Doe',
            password: 'password'
        }
    )
});

it('shows error message on password mismatch', async () => {
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'password' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'differentPassword' } });
    fireEvent.click(screen.getByRole('button', { name: /Signup/i }));

    await waitFor(() => expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument());
});

it('does not submit when form fields are empty', async () => {
    fireEvent.click(screen.getByRole('button', { name: /Signup/i }));

    expect(screen.queryByText(/Thanks for signing up!/i)).not.toBeInTheDocument();
});

it('shows error message when email already registered', async () => {
    axios.post.mockRejectedValue({ 
        response: {
            status: 400,
            data: { message: 'Email already registered - please log in' }
        }
    });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'password' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Signup/i }));

    expect(screen.queryByText(/Thanks for signing up!/i)).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Email already registered - please log in/i)).toBeInTheDocument());
});

it('does not submit when one of the fields is empty', async () => {
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@test.com' } });
    // First Name is left empty
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'password' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Signup/i }));

    expect(screen.queryByText(/Thanks for signing up!/i)).not.toBeInTheDocument();
});
