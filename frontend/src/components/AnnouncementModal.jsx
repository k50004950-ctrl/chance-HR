import React from 'react';

const AnnouncementModal = ({ announcement, onClose }) => {
  if (!announcement) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
      >
        <div className="modal-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '2px solid #6366f1',
          paddingBottom: '12px'
        }}>
          <h3 style={{ 
            margin: 0, 
            color: '#6366f1',
            fontSize: '20px',
            fontWeight: '600'
          }}>
            📢 {announcement.title}
          </h3>
          <button
            className="modal-close"
            onClick={onClose}
            style={{
              fontSize: '28px',
              color: '#6b7280',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0',
              lineHeight: '1'
            }}
          >
            ×
          </button>
        </div>
        
        <div className="modal-body" style={{ paddingTop: '20px' }}>
          <div style={{
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6',
            color: '#374151',
            fontSize: '15px'
          }}>
            {announcement.content}
          </div>
          
          <div style={{
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '13px',
            color: '#6b7280',
            textAlign: 'right'
          }}>
            {new Date(announcement.created_at).toLocaleString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>
        
        <div style={{ 
          marginTop: '24px', 
          display: 'flex', 
          justifyContent: 'center' 
        }}>
          <button
            className="btn btn-primary"
            onClick={onClose}
            style={{ minWidth: '120px' }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementModal;
