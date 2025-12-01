import React from 'react';

const AnnotationSidebar = ({ annotations, onDelete, onExport }) => {
  return (
    <div className="annotation-sidebar">
      <div className="sidebar-header">
        <h3>Annotations</h3>
        <span className="count">{annotations.length}</span>
      </div>

      <div className="annotation-list">
        {annotations.length === 0 ? (
          <div className="no-annotations">
            <p>Hold <strong>Shift</strong> + <strong>Drag</strong> on any chart to annotate an event.</p>
          </div>
        ) : (
          annotations.map((ann) => (
            <div key={ann.id} className="annotation-card">
              <div className="ann-header">
                <span className="ann-label">{ann.label}</span>
                <button onClick={() => onDelete(ann.id)} className="delete-btn">×</button>
              </div>
              <div className="ann-time">
                {ann.start.toFixed(2)}s - {ann.end.toFixed(2)}s
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <button 
            className="export-button" 
            onClick={onExport}
            disabled={annotations.length === 0}
        >
          Export All (ZIP)
        </button>
      </div>
    </div>
  );
};

export default AnnotationSidebar;