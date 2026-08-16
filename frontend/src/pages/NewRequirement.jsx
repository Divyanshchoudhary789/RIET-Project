import React, { useMemo, useState } from 'react';
import {
  Check,
  FilePlus2,
  IndianRupee,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/dashboard.css';

const createEmptyItem = () => ({
  id: crypto.randomUUID(),
  name: '',
  quantity: 1,
  estimation: '',
});

const NewRequirement = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('Centre');
  const [alreadyInStock, setAlreadyInStock] = useState(false);
  const [items, setItems] = useState([createEmptyItem()]);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalEstimation = useMemo(() => {
    return items.reduce((total, item) => {
      const amount =
        Number(item.quantity || 0) * Number(item.estimation || 0);

      return total + amount;
    }, 0);
  }, [items]);

  const addItem = () => {
    setItems((previousItems) => [
      ...previousItems,
      createEmptyItem(),
    ]);
  };

  const removeItem = (itemId) => {
    if (items.length === 1) {
      setItems([createEmptyItem()]);
      return;
    }

    setItems((previousItems) =>
      previousItems.filter((item) => item.id !== itemId)
    );
  };

  const updateItem = (itemId, field, value) => {
    setItems((previousItems) =>
      previousItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );

    if (error) {
      setError('');
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      return 'Please enter the requirement title.';
    }

    const invalidItem = items.some(
      (item) =>
        !item.name.trim() ||
        Number(item.quantity) < 1 ||
        (!alreadyInStock && Number(item.estimation) < 1)
    );

    if (invalidItem) {
      return alreadyInStock
        ? 'Please enter an item name and valid quantity.'
        : 'Please complete every item with a valid quantity and estimation.';
    }

    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const existingRequirements = JSON.parse(
        localStorage.getItem('centreRequirements') || '[]'
      );

      const newRequirement = {
        id: crypto.randomUUID(),
        title: title.trim(),
        scope,
        alreadyInStock,
        type: alreadyInStock
          ? 'Material Already in Stock'
          : 'Purchase Required',
        status: alreadyInStock ? 'Approved' : 'Pending',
        currentStage: alreadyInStock
          ? 'Chairperson'
          : 'Cluster Manager',
        items: items.map((item) => ({
          ...item,
          name: item.name.trim(),
          quantity: Number(item.quantity),
          estimation: alreadyInStock
            ? 0
            : Number(item.estimation),
        })),
        totalEstimation: alreadyInStock ? 0 : totalEstimation,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(
        'centreRequirements',
        JSON.stringify([newRequirement, ...existingRequirements])
      );

      setShowSuccess(true);

      window.setTimeout(() => {
        navigate('/dashboard/centre-head');
      }, 900);
    } catch (requestError) {
      console.error('Requirement creation failed:', requestError);
      setError('Unable to create the requirement. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="new-requirement-page">
      <div className="new-requirement-heading">
        <div>
          <span className="page-subtitle">CREATE REQUEST</span>
          <h1 className="new-requirement-title">
            New Requirement
          </h1>
          <p className="new-requirement-description">
            Add requirement information and submit it for the
            appropriate approval workflow.
          </p>
        </div>

        <button
          type="button"
          className="secondary-outline-button"
          onClick={() => navigate('/dashboard/centre-head')}
        >
          Back to dashboard
        </button>
      </div>

      {error && (
        <div className="requirement-alert requirement-alert-error">
          {error}
        </div>
      )}

      {showSuccess && (
        <div className="requirement-alert requirement-alert-success">
          <Check size={19} />
          Requirement created successfully. Redirecting...
        </div>
      )}

      <form
        className="new-requirement-form"
        onSubmit={handleSubmit}
      >
        <section className="requirement-form-card">
          <div className="form-section-heading">
            <div className="form-section-icon">
              <FilePlus2 size={20} />
            </div>

            <div>
              <h2>Basic Details</h2>
              <p>
                Enter the primary information for this requirement.
              </p>
            </div>
          </div>

          <div className="requirement-form-content">
            <div className="requirement-field">
              <label htmlFor="requirement-title">Title</label>

              <input
                id="requirement-title"
                type="text"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);

                  if (error) {
                    setError('');
                  }
                }}
                placeholder="e.g. New projectors for Lab A"
                maxLength={120}
              />
            </div>

            <fieldset className="scope-fieldset">
              <legend>Scope</legend>

              <div className="scope-options">
                {['Centre', 'Local'].map((scopeOption) => (
                  <label
                    key={scopeOption}
                    className={`scope-option ${
                      scope === scopeOption
                        ? 'scope-option-selected'
                        : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value={scopeOption}
                      checked={scope === scopeOption}
                      onChange={(event) =>
                        setScope(event.target.value)
                      }
                    />

                    <span className="custom-radio" />
                    <span>{scopeOption}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="stock-toggle-card">
              <div>
                <h3>Already in stock</h3>
                <p>
                  Skips Purchase / PO / Accounts and dispatches
                  directly after Chairperson.
                </p>
              </div>

              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={alreadyInStock}
                  onChange={(event) =>
                    setAlreadyInStock(event.target.checked)
                  }
                />

                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </section>

        <section className="requirement-form-card">
          <div className="items-card-header">
            <div className="form-section-heading items-heading">
              <div className="form-section-icon">
                <IndianRupee size={20} />
              </div>

              <div>
                <h2>Items</h2>
                <p>
                  Add one or more items included in this request.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="add-item-button"
              onClick={addItem}
            >
              <Plus size={18} />
              Add more
            </button>
          </div>

          <div className="requirement-form-content">
            <div className="items-list">
              {items.map((item, index) => (
                <div className="item-row" key={item.id}>
                  <div className="requirement-field item-name-field">
                    <label htmlFor={`item-name-${item.id}`}>
                      Item Name
                    </label>

                    <input
                      id={`item-name-${item.id}`}
                      type="text"
                      value={item.name}
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          'name',
                          event.target.value
                        )
                      }
                      placeholder={`Item ${index + 1}`}
                    />
                  </div>

                  <div className="requirement-field quantity-field">
                    <label htmlFor={`quantity-${item.id}`}>
                      Qty
                    </label>

                    <input
                      id={`quantity-${item.id}`}
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          'quantity',
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className="requirement-field estimation-field">
                    <label htmlFor={`estimation-${item.id}`}>
                      Estimation (₹)
                    </label>

                    <input
                      id={`estimation-${item.id}`}
                      type="number"
                      min="0"
                      value={item.estimation}
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          'estimation',
                          event.target.value
                        )
                      }
                      placeholder={
                        alreadyInStock ? 'Not required' : '0'
                      }
                      disabled={alreadyInStock}
                    />
                  </div>

                  <button
                    type="button"
                    className="delete-item-button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Delete item ${index + 1}`}
                    title="Delete item"
                  >
                    <Trash2 size={19} />
                  </button>
                </div>
              ))}
            </div>

            {!alreadyInStock && (
              <div className="estimation-summary">
                <span>Total estimated value</span>
                <strong>
                  ₹
                  {totalEstimation.toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                  })}
                </strong>
              </div>
            )}
          </div>
        </section>

        <div className="requirement-form-actions">
          <button
            type="button"
            className="cancel-requirement-button"
            onClick={() => navigate('/dashboard/centre-head')}
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="submit-requirement-button"
            disabled={isSubmitting}
          >
            <Send size={18} />
            {isSubmitting
              ? 'Submitting...'
              : 'Submit Requirement'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default NewRequirement;
