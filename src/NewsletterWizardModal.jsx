import { useEffect, useMemo, useState } from 'react';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function normalizeEmails(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function resolveState(input, allStates) {
  if (!input) return null;
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  const match = (allStates || []).find((entry) => (
    entry.code.toLowerCase() === trimmed
    || entry.name.toLowerCase() === trimmed
  ));
  return match || null;
}

export default function NewsletterWizardModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  allStates,
  topicOptions,
}) {
  const [step, setStep] = useState(0);
  const [newsletterName, setNewsletterName] = useState('');
  const [personName, setPersonName] = useState('');
  const [stateInput, setStateInput] = useState('');
  const [topics, setTopics] = useState([]);
  const [topicDepths, setTopicDepths] = useState({});
  const [tone, setTone] = useState('neutral');
  const [includeKeywords, setIncludeKeywords] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [days, setDays] = useState(['Mon']);
  const [emailsInput, setEmailsInput] = useState('');

  const resolvedState = useMemo(() => resolveState(stateInput, allStates), [stateInput, allStates]);
  const stateLabel = resolvedState ? resolvedState.name : 'your area';

  useEffect(() => {
    if (!isOpen) return;

    setStep(0);
    setNewsletterName(initialData?.newsletterName || '');
    setPersonName(initialData?.personName || '');
    setStateInput(initialData?.location?.state || '');
    setTopics(Array.isArray(initialData?.topics) ? initialData.topics : ['top-stories']);
    setTopicDepths(initialData?.topicDepths || {});
    setTone(initialData?.tone || 'neutral');
    setIncludeKeywords((initialData?.keywords?.include || []).join(', '));
    setFrequency(initialData?.schedule?.frequency || 'weekly');
    setDays(Array.isArray(initialData?.schedule?.days) && initialData.schedule.days.length ? initialData.schedule.days : ['Mon']);
    setEmailsInput((initialData?.emails || []).join(', '));
  }, [isOpen, initialData]);

  useEffect(() => {
    if (frequency === 'daily') {
      setDays([...WEEK_DAYS]);
    } else if (!days.length) {
      setDays(['Mon']);
    }
  }, [frequency]);

  function toggleTopic(key) {
    setTopics((prev) => {
      if (prev.includes(key)) {
        setTopicDepths((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
        return prev.filter((item) => item !== key);
      }
      return [...prev, key];
    });
  }

  function toggleDay(day) {
    if (frequency === 'daily') return;
    setDays((prev) => {
      if (prev.includes(day)) return prev.filter((d) => d !== day);
      return [...prev, day];
    });
  }

  function handleNext() {
    setStep((prev) => Math.min(prev + 1, 2));
  }

  function handleBack() {
    setStep((prev) => Math.max(prev - 1, 0));
  }

  function buildPayload() {
    const normalizedState = resolvedState ? resolvedState.code : stateInput.trim();
    return {
      ...initialData,
      newsletterName: newsletterName.trim(),
      personName: personName.trim(),
      location: {
        state: normalizedState,
      },
      topics,
      topicDepths,
      tone,
      keywords: {
        include: normalizeEmails(includeKeywords),
      },
      schedule: {
        frequency,
        days: frequency === 'daily' ? [...WEEK_DAYS] : days,
        lookbackDays: frequency === 'daily' ? 1 : 7,
      },
      emails: normalizeEmails(emailsInput),
      updatedAt: new Date().toISOString(),
    };
  }

  function handleSave(generateNow) {
    const payload = buildPayload();
    onSave(payload, generateNow);
  }

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  useEffect(() => {
    if (!isOpen) return undefined;

    function handleEscape(e) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleBackdropClick}>
      <div className="modal-container" style={{ maxWidth: '760px' }}>
        <div className="modal-header">
          <h2>Personal Newsletter Setup</h2>
          <button className="modal-close" onClick={onClose}>Ã—</button>
        </div>

        <div className="modal-body">
          {step === 0 && (
            <>
              <div className="form-group">
                <label htmlFor="newsletter-name">Newsletter name (optional)</label>
                <input
                  id="newsletter-name"
                  className="modal-input"
                  value={newsletterName}
                  onChange={(e) => setNewsletterName(e.target.value)}
                  placeholder="e.g., Alex's Weekly Brief"
                />
              </div>
              <div className="form-group">
                <label htmlFor="person-name">What is your name?</label>
                <input
                  id="person-name"
                  className="modal-input"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="state-select">Where are you from?</label>
                <input
                  id="state-select"
                  className="modal-input"
                  list="state-options"
                  value={stateInput}
                  onChange={(e) => setStateInput(e.target.value)}
                  placeholder="Type your state"
                />
                <datalist id="state-options">
                  {(allStates || []).map((state) => (
                    <option key={state.code} value={state.name} />
                  ))}
                </datalist>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="form-group">
                <label>What would you like to receive news about?</label>
                <div className="checkboxes-container">
                  {(topicOptions || []).map((option) => {
                    const selected = topics.includes(option.key);
                    return (
                    <label
                      key={option.key}
                      className="checkbox-label"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: selected ? '#18bfef' : undefined,
                        fontWeight: selected ? 600 : 400,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleTopic(option.key)}
                      />
                      <span>
                        {option.key === 'local' ? `Local News of ${stateLabel}` : option.label}
                      </span>
                    </label>
                  )})}
                </div>
              </div>
              {topics.length > 0 && (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Depth per topic
                    <span
                      title="Brief: 1-2 sentences. Short: a few sentences. Standard: full paragraph. Deep: multiple paragraphs and context."
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        fontSize: '12px',
                        cursor: 'help',
                      }}
                    >
                      i
                    </span>
                  </label>
                  <div className="checkboxes-container">
                    {topics.map((topic) => (
                      <label key={topic} className="checkbox-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0.35rem' }}>
                        <span style={{ fontWeight: 600 }}>{topicOptions?.find((o) => o.key === topic)?.label || topic}</span>
                        <input
                          type="range"
                          min="1"
                          max="4"
                          step="1"
                          value={topicDepths[topic] || 2}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            setTopicDepths((prev) => ({ ...prev, [topic]: value }));
                          }}
                        />
                        <div style={{ fontSize: '0.85rem', color: '#cfd8e3' }}>
                          {topicDepths[topic] === 1 && 'Brief'}
                          {topicDepths[topic] === 2 && 'Short'}
                          {topicDepths[topic] === 3 && 'Standard'}
                          {topicDepths[topic] === 4 && 'Deep'}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="form-group">
                <label htmlFor="include-keywords">Keywords to include (comma separated)</label>
                <input
                  id="include-keywords"
                  className="modal-input"
                  value={includeKeywords}
                  onChange={(e) => setIncludeKeywords(e.target.value)}
                  placeholder="e.g., AI chips, election, housing"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-group">
                <label htmlFor="frequency-select">How often should we send this newsletter?</label>
                <select
                  id="frequency-select"
                  className="modal-input"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">1-3 times a week</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="tone-select">Tone of voice</label>
                <select
                  id="tone-select"
                  className="modal-input"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                >
                  <option value="neutral">Neutral</option>
                  <option value="concise">Concise</option>
                  <option value="conversational">Conversational</option>
                  <option value="analytical">Analytical</option>
                </select>
              </div>
              <div className="form-group">
                <label>Preferred days of the week</label>
                <div className="checkboxes-container">
                  {WEEK_DAYS.map((day) => {
                    const selected = days.includes(day);
                    return (
                    <label
                      key={day}
                      className="checkbox-label"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: selected ? '#18bfef' : undefined,
                        fontWeight: selected ? 600 : 400,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={frequency === 'daily'}
                        onChange={() => toggleDay(day)}
                      />
                      <span>{day}</span>
                    </label>
                  )})}
                </div>
                {frequency === 'daily' && (
                  <p style={{ marginTop: '0.5rem' }}>Daily newsletters send every day.</p>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="emails-input">Emails to send to (comma separated)</label>
                <input
                  id="emails-input"
                  className="modal-input"
                  value={emailsInput}
                  onChange={(e) => setEmailsInput(e.target.value)}
                  placeholder="you@example.com, team@example.com"
                />
              </div>
            </>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="button-secondary" onClick={onClose}>
              Cancel
            </button>
            {step > 0 && (
              <button className="button-secondary" onClick={handleBack}>
                Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {step < 2 ? (
              <button className="button-primary" onClick={handleNext}>
                Next
              </button>
            ) : (
              <>
                <button className="button-secondary" onClick={() => handleSave(false)}>
                  Save and Exit
                </button>
                <button className="button-primary" onClick={() => handleSave(true)}>
                  Save + Generate Now
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
