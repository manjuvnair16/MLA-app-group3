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
