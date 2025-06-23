import React from 'react';
import { X, CheckCircle, Trash2, List, CheckSquare } from 'lucide-react';
import '../App.css'; // Assuming App.css contains modal styling

const ArchiveModal = ({ archivedItems, onClose }) => {
  // Sort items by archivedAt, most recent first
  const sortedArchivedItems = [...archivedItems].sort((a, b) => new Date(b.archivedAt) - new Date(a.archivedAt));

  const completedTasks = sortedArchivedItems.filter(item => item.type === 'task' && item.archivedReason === 'completed');
  const deletedTasks = sortedArchivedItems.filter(item => item.type === 'task' && item.archivedReason === 'deleted');
  const completedLists = sortedArchivedItems.filter(item => item.type === 'list' && item.archivedReason === 'completed');
  const deletedLists = sortedArchivedItems.filter(item => item.type === 'list' && item.archivedReason === 'deleted');

  return (
    <div className="modal-overlay">
      <div className="modal-content archive-modal-content"> {/* Added a specific class for archive modal if needed */}
        <div className="modal-header">
          <h2>Archive Log</h2>
          <button onClick={onClose} className="close-modal-btn">
            <X size={24} />
          </button>
        </div>

        {sortedArchivedItems.length === 0 && (
          <p className="empty-state">Your archive is empty.</p>
        )}

        {/* Display Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="archive-section">
            <h3><CheckCircle size={18} /> Completed Tasks</h3>
            {completedTasks.map(item => (
              <div key={item.id} className="archive-item task-item-archive">
                <span className="archive-item-text">{item.text}</span>
                <span className="archive-item-date">{new Date(item.archivedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Display Deleted Tasks */}
        {deletedTasks.length > 0 && (
          <div className="archive-section">
            <h3><Trash2 size={18} /> Deleted Tasks</h3>
            {deletedTasks.map(item => (
              <div key={item.id} className="archive-item task-item-archive">
                <span className="archive-item-text">{item.text}</span>
                <span className="archive-item-date">{new Date(item.archivedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Display Completed Lists */}
        {completedLists.length > 0 && (
          <div className="archive-section">
            <h3><List size={18} /> Completed Lists</h3>
            {completedLists.map(item => (
              <div key={item.id} className="archive-item list-item-archive">
                <span className="archive-item-text">{item.name}</span>
                <span className="archive-item-date">{new Date(item.archivedAt).toLocaleString()}</span>
                {/* Optionally show number of tasks or tasks themselves */}
                {item.tasks && item.tasks.length > 0 && (
                  <span className="archive-list-task-count">({item.tasks.length} tasks)</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Display Deleted Lists */}
        {deletedLists.length > 0 && (
          <div className="archive-section">
            <h3><Trash2 size={18} /> Deleted Lists</h3>
            {deletedLists.map(item => (
              <div key={item.id} className="archive-item list-item-archive">
                <span className="archive-item-text">{item.name}</span>
                <span className="archive-item-date">{new Date(item.archivedAt).toLocaleString()}</span>
                {item.tasks && item.tasks.length > 0 && (
                  <span className="archive-list-task-count">({item.tasks.length} tasks)</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchiveModal;