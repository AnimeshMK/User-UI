// src/Component/Checklist.jsx (UPDATED CONTENT)

import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckSquare, List, Check, StickyNote, Archive, LogOut } from 'lucide-react'; // Removed UserRound import
import { signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

import Confetti from 'react-confetti';
import ArchiveModal from './ArchiveModal';
import AccountModal from './AccountModal'; // Import the AccountModal

import '../App.css';

// --- Internal ProgressBar Component --- (NO CHANGE)
const ProgressBar = ({ completedTask, total, onCompleteList }) => {
  const percentage = total === 0 ? 0 : Math.round(((completedTask / total) * 100));

  return (
    <div className='container'>
      <div className='progress-container'>
        <div style={onCompleteList ? { width: '100%' } : { width: `${percentage}%` }} className='filler'>
          <span className='label'>{percentage}%</span>
        </div>
      </div>
    </div>
  );
};

// --- Internal Notes Component --- (NO CHANGE)
const Notes = ({ noteText, onChange, onClose, onSave }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <textarea
          value={noteText}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your notes here..."
        />
        <div className="modal-buttons">
          <button onClick={onSave}>Save</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

// --- Internal Task Component --- (NO CHANGE)
const Task = ({ task, onComplete, onOpenNotes, onArchive, onRestore }) => {
  const [deadlineStatusClass, setDeadlineStatusClass] = useState('');

  useEffect(() => {
    let intervalId;

    const updateDeadlineStatus = () => {
      if (task.completed || !task.deadline) {
        setDeadlineStatusClass('');
        if (intervalId) clearInterval(intervalId);
        return;
      }

      const now = new Date().getTime();
      const deadlineTime = new Date(task.deadline).getTime();
      const timeRemaining = deadlineTime - now;

      const oneHour = 60 * 60 * 1000;
      const oneDay = 24 * oneHour;

      let newClass = '';
      if (timeRemaining <= 0) {
        newClass = 'red-shadow-crossed';
        if (intervalId) clearInterval(intervalId);
      } else if (timeRemaining <= oneHour) {
        newClass = 'blink-red-shadow';
      } else if (timeRemaining <= oneDay) {
        newClass = 'blink-yellow-shadow';
      }
      setDeadlineStatusClass(newClass);
    };

    updateDeadlineStatus();
    intervalId = setInterval(updateDeadlineStatus, 30 * 1000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [task.deadline, task.completed]);

  return (
    <div className={`task-item ${task.completed ? 'completed' : ''} ${deadlineStatusClass}`}>
      <div className="task-details-main">
        <div className="task-content">
          <button
            onClick={() => onComplete(task.id)}
            className={`checkbox ${task.completed ? 'checked' : ''}`}
          >
            {task.completed && <Check size={12} />}
          </button>
          <span className={`task-text ${task.completed ? 'strikethrough' : ''}`}>
            {task.text}
          </span>
        </div>

        <div style={{ marginLeft: '30px', marginTop: '5px' }}>
          {task.assignedTime && (
            <div className="task-time-detail">Assigned: {task.assignedTime}</div>
          )}
          {task.deadline && (
            <div className="task-time-detail">
              Deadline: {new Date(task.deadline).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div className="task-actions">
        <button onClick={() => onOpenNotes(task.id, task.note)} className="note-btn">
          <StickyNote size={16} />
        </button>
        {task.archived ? (
          <button onClick={() => onRestore(task.id)} className="archive-btn">
            <RotateCcw size={16} />
          </button>
        ) : (
          <button onClick={() => onArchive(task.id)} className="archive-btn">
            <Archive size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

// --- Internal TodoList Component --- (NO CHANGE)
const TodoList = ({
  list,
  onComplete,
  onCompleteTask,
  onOpenNotes,
  onArchive,
  onRestore,
  onArchiveTaskInList,
  onRestoreTaskInList
}) => {
  const [showTasks, setShowTasks] = useState(false);

  const totalTasks = list.tasks.length;
  const completedTasks = list.completed
    ? totalTasks
    : list.tasks.filter((task) => task.completed).length;

  return (
    <div className={`todo-list-item ${list.completed ? "completed" : ""}`}>
      <div className="list-header">
        <div className="list-info">
          <button
            onClick={() => onComplete(list.id)}
            className={`checkbox ${list.completed ? 'checked' : ''}`}
          >
            {list.completed && <Check size={12} />}
          </button>
          <h3 className={`list-name ${list.completed ? "strikethrough" : ""}`}>
            {list.name}
          </h3>
          <span className="task-count">
            ({completedTasks}/{totalTasks})
          </span>
        </div>
        <div className="list-actions">
          <button
            onClick={() => setShowTasks(!showTasks)}
            className="toggle-btn"
          >
            <List size={16} />
          </button>
          {list.archived ? (
            <button onClick={() => onRestore(list.id)} className="archive-btn">
              <RotateCcw size={16} />
            </button>
          ) : (
            <button onClick={() => onArchive(list.id)} className="archive-btn">
              <Archive size={16} />
            </button>
          )}
        </div>
      </div>

      {showTasks && (
        <div className="list-tasks">
          <div className="tasks-container">
            {list.tasks.map((task) => (
              <Task
                key={task.id}
                task={task}
                onComplete={(taskId) => onCompleteTask(list.id, taskId)}
                onOpenNotes={(taskId, initialNote) => onOpenNotes(list.id, taskId, initialNote)}
                onArchive={(taskId) => onArchiveTaskInList(list.id, taskId)}
                onRestore={(taskId) => onRestoreTaskInList(list.id, taskId)}
              />
            ))}
            {list.tasks.length === 0 && (
              <p className="empty-state">No tasks in this list yet.</p>
            )}
          </div>
        </div>
      )}
      {list.tasks.length > 0 && (
        <ProgressBar completedTask={completedTasks} total={totalTasks} onCompleteList={list.completed} />
      )}
    </div>
  );
};


// --- Main Checklist Component ---
const Checklist = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [lists, setLists] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [archivedLists, setArchivedLists] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false); // State for AccountModal

  const [editingNoteTaskId, setEditingNoteTaskId] = useState(null);
  const [editingNoteListId, setEditingNoteListId] = useState(null);
  const [currentNoteText, setCurrentNoteText] = useState('');

  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);

  const checklistRef = useRef(null);
  const [checklistWidth, setChecklistWidth] = useState(0);
  const [checklistHeight, setChecklistHeight] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (checklistRef.current) {
        setChecklistWidth(checklistRef.current.offsetWidth);
        setChecklistHeight(checklistRef.current.offsetHeight);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user) {
      let taskString = localStorage.getItem(`tasks_${user.uid}`);
      let listString = localStorage.getItem(`lists_${user.uid}`);
      let archivedTaskString = localStorage.getItem(`archivedTasks_${user.uid}`);
      let archivedListString = localStorage.getItem(`archivedLists_${user.uid}`);

      setTasks(taskString ? JSON.parse(taskString) : []);
      setLists(listString ? JSON.parse(listString) : []);
      setArchivedTasks(archivedTaskString ? JSON.parse(archivedTaskString) : []);
      setArchivedLists(archivedListString ? JSON.parse(archivedListString) : []);
    } else {
      setTasks([]);
      setLists([]);
      setArchivedTasks([]);
      setArchivedLists([]);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(tasks));
    }
  }, [tasks, user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`lists_${user.uid}`, JSON.stringify(lists));
    }
  }, [lists, user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`archivedTasks_${user.uid}`, JSON.stringify(archivedTasks));
    }
  }, [archivedTasks, user]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`archivedLists_${user.uid}`, JSON.stringify(archivedLists));
    }
  }, [archivedLists, user]);

  const triggerConfetti = () => {
    setShowConfetti(true);
    setConfettiKey(prev => prev + 1);
    setTimeout(() => {
      setShowConfetti(false);
    }, 4000);
  };

  const completeTask = (id) => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === id) {
        const updatedTask = { ...task, completed: !task.completed };
        if (updatedTask.completed) {
          triggerConfetti();
          setArchivedTasks(prevArchived => [...prevArchived, { ...updatedTask, archived: true, archivedAt: new Date().toISOString(), type: 'task', archivedReason: 'completed' }]);
          return null;
        }
        return updatedTask;
      }
      return task;
    }).filter(task => task !== null));
  };

  const archiveTask = (id) => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === id) {
        setArchivedTasks(prevArchived => [...prevArchived, { ...task, archived: true, archivedAt: new Date().toISOString(), type: 'task', archivedReason: 'deleted' }]);
        return null;
      }
      return task;
    }).filter(task => task !== null));
  };

  const restoreTask = (id) => {
    setArchivedTasks(prevArchived => prevArchived.filter(task => task.id !== id));
    const taskToRestore = archivedTasks.find(task => task.id === id);
    if (taskToRestore) {
      setTasks(prevTasks => [...prevTasks, { ...taskToRestore, archived: false, completed: false }]);
    }
  };

  const handleOpenNotes = (taskId, initialNote) => {
    setEditingNoteTaskId(taskId);
    setEditingNoteListId(null);
    setCurrentNoteText(initialNote || '');
  };

  const handleOpenNotesForListTask = (listId, taskId, initialNote) => {
    setEditingNoteListId(listId);
    setEditingNoteTaskId(taskId);
    setCurrentNoteText(initialNote || '');
  };

  const handleCloseNotes = () => {
    setEditingNoteTaskId(null);
    setEditingNoteListId(null);
    setCurrentNoteText('');
  };

  const handleSaveNote = () => {
    if (editingNoteListId) {
      setLists(lists.map(list =>
        list.id === editingNoteListId
          ? {
            ...list,
            tasks: list.tasks.map(task =>
              task.id === editingNoteTaskId ? { ...task, note: currentNoteText } : task
            )
          }
          : list
      ));
      setArchivedLists(prevArchivedLists => prevArchivedLists.map(list =>
        list.id === editingNoteListId
          ? {
            ...list,
            tasks: list.tasks.map(task =>
              task.id === editingNoteTaskId ? { ...task, note: currentNoteText } : task
            )
          }
          : list
      ));
    } else {
      setTasks(tasks.map(task =>
        task.id === editingNoteTaskId ? { ...task, note: currentNoteText } : task
      ));
      setArchivedTasks(prevArchivedTasks => prevArchivedTasks.map(task =>
        task.id === editingNoteTaskId ? { ...task, note: currentNoteText } : task
      ));
    }
    handleCloseNotes();
  };

  const completeList = (id) => {
    setLists(prevLists => prevLists.map(list => {
      if (list.id === id) {
        const updatedList = { ...list, completed: !list.completed };
        if (updatedList.completed) {
          triggerConfetti();
          updatedList.tasks = updatedList.tasks.map(task => ({ ...task, completed: true, archived: true }));
          setArchivedLists(prevArchived => [...prevArchived, { ...updatedList, archived: true, archivedAt: new Date().toISOString(), type: 'list', archivedReason: 'completed' }]);
          return null;
        }
        return updatedList;
      }
      return list;
    }).filter(list => list !== null));
  };

  const archiveList = (id) => {
    setLists(prevLists => prevLists.map(list => {
      if (list.id === id) {
        setArchivedLists(prevArchived => [...prevArchived, { ...list, archived: true, archivedAt: new Date().toISOString(), type: 'list', archivedReason: 'deleted' }]);
        return null;
      }
      return list;
    }).filter(list => list !== null));
  };

  const restoreList = (id) => {
    setArchivedLists(prevArchived => prevArchived.filter(list => list.id !== id));
    const listToRestore = archivedLists.find(list => list.id === id);
    if (listToRestore) {
      setLists(prevLists => [...prevLists, { ...listToRestore, archived: false, completed: false, tasks: listToRestore.tasks.map(task => ({...task, archived: false, completed: false})) }]);
    }
  };

  const completeTaskInList = (listId, taskId) => {
    setLists(prevLists => prevLists.map(list => {
      if (list.id === listId) {
        const updatedTasks = list.tasks.map(task => {
          if (task.id === taskId) {
            const updatedTask = { ...task, completed: !task.completed };
            if (updatedTask.completed) {
              triggerConfetti();
            }
            return updatedTask;
          }
          return task;
        });
        const allTasksCompleted = updatedTasks.every(task => task.completed);
        return {
          ...list,
          tasks: updatedTasks,
          completed: allTasksCompleted
        };
      }
      return list;
    }));
  };

  const archiveTaskInList = (listId, taskId) => {
    setLists(prevLists => prevLists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          tasks: list.tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, archived: true };
            }
            return task;
          })
        };
      }
      return list;
    }));
  };

  const restoreTaskInList = (listId, taskId) => {
    setLists(prevLists => prevLists.map(list => {
        if (list.id === listId) {
            const updatedTasks = list.tasks.map(task => {
                if (task.id === taskId) {
                    return { ...task, archived: false, completed: false };
                }
                return task;
            });
            return { ...list, tasks: updatedTasks };
        }
        return list;
    }));
  };

  const allTasks = [...tasks, ...archivedTasks];
  const allLists = [...lists, ...archivedLists];

  const filteredTasks = allTasks.filter(task =>
    (showArchived ? task.archived : !task.archived) &&
    (task.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.note && task.note.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const filteredLists = allLists.filter(list =>
    (showArchived ? list.archived : !list.archived) &&
    (list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      list.tasks.some(task =>
        task.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.note && task.note.toLowerCase().includes(searchQuery.toLowerCase()))
      ))
  );

  const totalMainTasks = filteredTasks.length;
  const completedMainTasks = filteredTasks.filter(t => t.completed).length;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Clear all local storage data for the user on logout
      localStorage.removeItem(`tasks_${user.uid}`);
      localStorage.removeItem(`lists_${user.uid}`);
      localStorage.removeItem(`archivedTasks_${user.uid}`);
      localStorage.removeItem(`archivedLists_${user.uid}`);
      console.log("User logged out and local data cleared.");
      // App.jsx's onAuthStateChanged listener will handle redirect
      setShowAccountModal(false); // Close the modal on logout
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  };

  const allArchivedItems = [...archivedTasks, ...archivedLists];

  return (
    <div className="checklist-content" ref={checklistRef}>
      <div className="app-header">
        <h1 className="app-title">Secure Checklist</h1>
        {user && (
          <div className="user-account-section">
            {/* Account Icon Button - Now using an emoji */}
            <button
              onClick={() => setShowAccountModal(true)}
              className="account-button"
              title="My Account"
            >
              <span style={{ fontSize: '2em', lineHeight: '1em' }}>👤</span> {/* Emoji for user */}
            </button>
          </div>
        )}
      </div>

      <div className="add-form">
        <Search size={20} color="#a8dadc" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks or lists..."
          className="main-input"
        />
        <button onClick={() => setShowArchived(!showArchived)} className="toggle-archive-btn">
          {showArchived ? "Show Active" : "Show Archived"}
        </button>
        <button onClick={() => setShowArchiveModal(true)} className="add-btn secondary" style={{ marginLeft: '10px' }}>
          <Archive size={16} /> Archive Log
        </button>
      </div>

      <div className="content-area">
        {(filteredTasks.length > 0 || !showArchived) && (
          <div className="tasks-section">
            <h2 className="section-title">
              <CheckSquare size={20} />
              {showArchived ? "Archived Tasks" : "Active Tasks"} ({completedMainTasks}/{totalMainTasks})
            </h2>
            <div className="tasks-container">
              {filteredTasks.map(task => (
                <Task
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  onOpenNotes={handleOpenNotes}
                  onArchive={archiveTask}
                  onRestore={restoreTask}
                />
              ))}
            </div>
            {totalMainTasks > 0 && (
              <ProgressBar completedTask={completedMainTasks} total={totalMainTasks} onCompleteList={false} />
            )}
            {filteredTasks.length === 0 && searchQuery === '' && !showArchived && (
                <p className="empty-state">No active tasks yet. Add one above!</p>
            )}
             {filteredTasks.length === 0 && searchQuery === '' && showArchived && (
                <p className="empty-state">No archived tasks.</p>
            )}
          </div>
        )}

        {(filteredLists.length > 0 || !showArchived) && (
          <div className="lists-section">
            <h2 className="section-title">
              <List size={20} />
              {showArchived ? "Archived Lists" : "Active Lists"} ({filteredLists.filter(l => l.completed).length}/{filteredLists.length})
            </h2>
            <div className="lists-container">
              {filteredLists.map(list => (
                <TodoList
                  key={list.id}
                  list={list}
                  onComplete={completeList}
                  onCompleteTask={completeTaskInList}
                  onOpenNotes={handleOpenNotesForListTask}
                  onArchive={archiveList}
                  onRestore={restoreList}
                  onArchiveTaskInList={archiveTaskInList}
                  onRestoreTaskInList={restoreTaskInList}
                />
              ))}
            </div>
             {filteredLists.length === 0 && searchQuery === '' && !showArchived && (
                <p className="empty-state">No active lists yet. Add one above!</p>
            )}
            {filteredLists.length === 0 && searchQuery === '' && showArchived && (
                <p className="empty-state">No archived lists.</p>
            )}
          </div>
        )}

        {searchQuery !== '' && filteredTasks.length === 0 && filteredLists.length === 0 && (
          <div className="empty-state">
            <p>No matching tasks or lists found for "{searchQuery}".</p>
          </div>
        )}
      </div>

      {(editingNoteTaskId !== null) && (
        <Notes
          noteText={currentNoteText}
          onChange={setCurrentNoteText}
          onClose={handleCloseNotes}
          onSave={handleSaveNote}
        />
      )}

      {showArchiveModal && (
        <ArchiveModal archivedItems={allArchivedItems} onClose={() => setShowArchiveModal(false)} />
      )}

      {/* Account Modal */}
      {showAccountModal && user && (
        <AccountModal
          user={user}
          onClose={() => setShowAccountModal(false)}
          onSignOut={handleLogout} // Pass the existing logout handler
        />
      )}

      {showConfetti && checklistWidth > 0 && checklistHeight > 0 && (
        <>
          <Confetti
            key={`left-confetti-${confettiKey}`}
            width={checklistWidth}
            height={checklistHeight}
            recycle={false}
            numberOfPieces={125}
            gravity={0.15}
            wind={0.05}
            confettiSource={{ x: 0, y: 0, w: 50, h: checklistHeight }}
            tweenDuration={4000}
            colors={['#a8dadc', '#61dafb', '#f2b5d4', '#e0e0e0', '#87ceeb']}
          />
          <Confetti
            key={`right-confetti-${confettiKey}`}
            width={checklistWidth}
            height={checklistHeight}
            recycle={false}
            numberOfPieces={125}
            gravity={0.15}
            wind={-0.05}
            confettiSource={{ x: checklistWidth - 50, y: 0, w: 50, h: checklistHeight }}
            tweenDuration={4000}
            colors={['#a8dadc', '#61dafb', '#f2b5d4', '#e0e0e0', '#87ceeb']}
          />
        </>
      )}
    </div>
  );
};

export default Checklist;
