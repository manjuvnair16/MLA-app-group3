import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { createCustomActivity } from '../api.js';
import './CustomActivityModal.css';

const CustomActivityModal = ({ show, onHide, onActivityCreated, currentUser }) => {
  const [activityName, setActivityName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    setActivityName('');
    setError('');
    onHide();
  };

  const validateActivityName = (name) => {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      return 'Activity name is required';
    }
    
    if (trimmedName.length < 2) {
      return 'Activity name must be at least 2 characters long';
    }
    
    if (trimmedName.length > 30) {
      return 'Activity name must be 30 characters or less';
    }
    
    // Check for valid characters (letters, numbers, spaces, hyphens)
    const validPattern = /^[a-zA-Z0-9\s\-]+$/;
    if (!validPattern.test(trimmedName)) {
      return 'Activity name can only contain letters, numbers, spaces, and hyphens';
    }
    
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateActivityName(activityName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      // Use the centralized API function
      const response = await createCustomActivity({
        username: currentUser,
        activityName: activityName.trim()
      });

      console.log('Create activity response:', response.data);

      // Success! Call the parent callback
      if (onActivityCreated && response.data.customActivity) {
        onActivityCreated(response.data.customActivity);
      }

      // Reset and close
      setActivityName('');
      setError('');
      handleClose();
      
    } catch (err) {
      console.error('Error creating custom activity:', err);
      
      // Extract error message from response
      const errorMessage = err.response?.data?.error || 'Failed to create custom activity';
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create Custom Activity</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <p className="modal-description">
          Add a new activity type that will appear in your activity list. 
          You can create up to 10 custom activities.
        </p>
        
        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="activityName">
            <Form.Label>Activity Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g., Rock Climbing, Boxing, Pilates"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              maxLength={30}
              disabled={isSubmitting}
              autoFocus
            />
            <Form.Text className="text-muted">
              {activityName.length}/30 characters
            </Form.Text>
          </Form.Group>
        </Form>
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit} 
          disabled={isSubmitting || !activityName.trim()}
        >
          {isSubmitting ? 'Creating...' : 'Create Activity'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CustomActivityModal;