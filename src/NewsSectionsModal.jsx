import { useEffect, useMemo, useState } from 'react';

export default function NewsSectionsModal({ isOpen, onClose, onSave, options, selectedKeys }) {
  const [draftSelected, setDraftSelected] = useState([]);

  const optionLookup = useMemo(() => {
    const map = new Map();
    options.forEach((option) => map.set(option.key, option));
    return map;
  }, [options]);

  useEffect(() => {
    if (isOpen) {
      setDraftSelected(Array.isArray(selectedKeys) ? selectedKeys : []);
    }
  }, [isOpen, selectedKeys]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleEscape(e) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  function toggleCategory(key) {
    setDraftSelected((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      return [...prev, key];
    });
  }

  function moveCategory(key, direction) {
    setDraftSelected((prev) => {
      const index = prev.indexOf(key);
      if (index === -1) return prev;

      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;

      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function handleSave() {
    const validKeys = draftSelected.filter((key) => optionLookup.has(key));
    onSave(validKeys);
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!isOpen) return null;

  const selectedSet = new Set(draftSelected);
  const selectedOptions = draftSelected
    .map((key) => options.find((option) => option.key === key))
    .filter(Boolean);
  const unselectedOptions = options.filter((option) => !selectedSet.has(option.key));
  const orderedOptions = [...selectedOptions, ...unselectedOptions];

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-container">
        <div className="modal-header">
          <h2>Add News Sections</h2>
          <button
            className="modal-close modal-close-white"
            onClick={onClose}
            style={{ color: '#ffffff', opacity: 1, borderColor: '#ffffff' }}
          >
            x
          </button>
        </div>

        <div className="modal-body" style={{ color: '#f5f7fa' }}>
          <div className="checkboxes-container">
            {orderedOptions.map((option) => {
              const isSelected = draftSelected.includes(option.key);
              const selectedIndex = draftSelected.indexOf(option.key);
              return (
                <div key={option.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, marginBottom: 0 }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCategory(option.key)}
                    />
                    <span style={{ fontFamily: 'monospace', minWidth: '2.5rem' }}>
                      {isSelected ? '[x]' : '[ ]'}
                    </span>
                    <span>{option.label}</span>
                  </label>
                  {isSelected ? (
                    <>
                      <button
                        type="button"
                        className={`button small section-reorder-btn ${selectedIndex === 0 ? 'section-reorder-btn-disabled' : ''}`}
                        style={{
                          textTransform: 'none',
                          padding: '0 0.7rem',
                          minWidth: '2.3rem',
                          color: '#ffffff',
                          borderColor: '#ffffff',
                          opacity: 1,
                        }}
                        disabled={selectedIndex === 0}
                        onClick={() => moveCategory(option.key, 'up')}
                      >
                        ^
                      </button>
                      <button
                        type="button"
                        className={`button small section-reorder-btn ${selectedIndex === draftSelected.length - 1 ? 'section-reorder-btn-disabled' : ''}`}
                        style={{
                          textTransform: 'none',
                          padding: '0 0.7rem',
                          minWidth: '2.3rem',
                          color: '#ffffff',
                          borderColor: '#ffffff',
                          opacity: 1,
                        }}
                        disabled={selectedIndex === draftSelected.length - 1}
                        onClick={() => moveCategory(option.key, 'down')}
                      >
                        v
                      </button>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="button-secondary modal-cancel-white" onClick={onClose}>
            Cancel
          </button>
          <button className="button-primary" onClick={handleSave}>
            Save Sections
          </button>
        </div>
      </div>
    </div>
  );
}
