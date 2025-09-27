import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import Signup from './signup';
import { MemoryRouter } from 'react-router-dom';

jest.mock('axios');

it('renders signup form', () => {
    render(
        <MemoryRouter>  
            <Signup onSignup={jest.fn()} />
        </MemoryRouter>
    );
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Signup/i })).toBeInTheDocument();
});

it('calls onSignup on successful signup', async () => {
    axios.post.mockResolvedValue({ data: 'User registered successfully!' });
    const onSignup = jest.fn();
    render(
        <MemoryRouter>
            <Signup onSignup={onSignup} />
        </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'password' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: /Signup/i }));

    await waitFor(() => expect(onSignup).toHaveBeenCalledWith('test@test.com'));
});
