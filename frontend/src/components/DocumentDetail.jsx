import React from 'react';
import DocumentDrawer from './DocumentDrawer';

/**
 * Wrapper over DocumentDrawer for backwards compatibility.
 */
const DocumentDetail = ({ open, onClose, title, document: doc, docType, extraActions }) => {
  if (!open || !doc) return null;
  return (
    <DocumentDrawer
      doc={doc}
      docType={docType || title || 'Document'}
      onClose={onClose}
      footer={extraActions}
    />
  );
};

export default DocumentDetail;
