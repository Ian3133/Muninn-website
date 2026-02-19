import { useState, useEffect } from 'react';

export default function CustomizeModal({ isOpen, onClose, onSave, initialData }) {
  const [comment, setComment] = useState('');
  const [checkbox1, setCheckbox1] = useState(false);
  const [checkbox2, setCheckbox2] = useState(false);
  const [checkbox3, setCheckbox3] = useState(false);

  useEffect(() => {
    if (initialData) {
      setComment(initialData.comment || '');
      setCheckbox1(initialData.checkbox1 || false);
      setCheckbox2(initialData.checkbox2 || false);
      setCheckbox3(initialData.checkbox3 || false);
    }
  }, [initialData, isOpen]);

  const handleSave = () => {
    onSave({
      comment,
      checkbox1,
      checkbox2,
      checkbox3
    });
    alert('Preferences saved successfully!');
  };

  const handleClose = () => {
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-container">
        <div className="modal-header">
          <h2>Customize Newsletter</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label htmlFor="newsletter-comment">Your Comment</label>
            <textarea
              id="newsletter-comment"
              className="modal-textarea"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Enter your preferences or comments..."
              rows="5"
            />
          </div>

          <div className="form-group">
            <label>Select Options</label>
            <div className="checkboxes-container">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={checkbox1}
                  onChange={(e) => setCheckbox1(e.target.checked)}
                />
                <span>Option 1</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={checkbox2}
                  onChange={(e) => setCheckbox2(e.target.checked)}
                />
                <span>Option 2</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={checkbox3}
                  onChange={(e) => setCheckbox3(e.target.checked)}
                />
                <span>Option 3</span>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="button-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button className="button-primary" onClick={handleSave}>
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
