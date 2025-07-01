// src/Component/Checklist.jsx (UPDATED CONTENT)

import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckSquare, List, Check, StickyNote, Archive, LogOut, RotateCcw, Trash2 } from 'lucide-react'; // Added RotateCcw and Trash2 import
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig'; // Import db
import { collection, addDoc, updateDoc, deleteDoc, query, where, onSnapshot, doc, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore'; // Import Firestore functions

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

// --- Internal Task Component --- (NO CHANGE, but assumes task object has Firestore ID)
const Task = ({ task, onComplete, onOpenNotes, onArchive, onRestore, onDelete }) => { // Added onDelete
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
          <>
            <button onClick={() => onRestore(task.id)} className="archive-btn">
              <RotateCcw size={16} />
            </button>
            <button onClick={() => onDelete(task.id, task.type)} className="delete-btn">
              <Trash2 size={16} />
            </button>
          </>
        ) : (
          <button onClick={() => onArchive(task.id)} className="archive-btn">
            <Archive size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

// --- Internal TodoList Component --- (NO CHANGE, but assumes list object has Firestore ID)
const TodoList = ({
  list,
  onComplete,
  onCompleteTask,
  onOpenNotes,
  onArchive,
  onRestore,
  onArchiveTaskInList,
  onRestoreTaskInList,
  onDeleteList, // Added onDeleteList
  onDeleteTaskInList // Added onDeleteTaskInList
}) => {
  const [showTasks, setShowTasks] = useState(false);

  const totalTasks = list.tasks ? list.tasks.length : 0;
  const completedTasks = list.completed
    ? totalTasks
    : (list.tasks ? list.tasks.filter((task) => task.completed).length : 0);

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
            <>
              <button onClick={() => onRestore(list.id)} className="archive-btn">
                <RotateCcw size={16} />
              </button>
              <button onClick={() => onDeleteList(list.id)} className="delete-btn">
                <Trash2 size={16} />
              </button>
            </>
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
            {list.tasks && list.tasks.map((task) => (
              <Task
                key={task.id}
                task={task}
                onComplete={(taskId) => onCompleteTask(list.id, taskId)}
                onOpenNotes={(taskId, initialNote) => onOpenNotes(list.id, taskId, initialNote)}
                onArchive={(taskId) => onArchiveTaskInList(list.id, taskId)}
                onRestore={(taskId) => onRestoreTaskInList(list.id, taskId)}
                onDelete={(taskId) => onDeleteTaskInList(list.id, taskId)} // Pass new delete handler
              />
            ))}
            {totalTasks === 0 && (
              <p className="empty-state">No tasks in this list yet.</p>
            )}
          </div>
        </div>
      )}
      {totalTasks > 0 && (
        <ProgressBar completedTask={completedTasks} total={totalTasks} onCompleteList={list.completed} />
      )}
    </div>
  );
};


// --- Main Checklist Component ---
const Checklist = ({ user }) => {
  const [tasks, setTasks] = useState([]);
  const [lists, setLists] = useState([]);
  // archivedTasks and archivedLists will be derived from 'tasks' and 'lists' from Firestore
  // const [archivedTasks, setArchivedTasks] = useState([]); // No longer needed as a separate state
  // const [archivedLists, setArchivedLists] = useState([]); // No longer needed as a separate state

  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);

  const [editingNoteTaskId, setEditingNoteTaskId] = useState(null);
  const [editingNoteListId, setEditingNoteListId] = useState(null);
  const [currentNoteText, setCurrentNoteText] = useState('');

  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);

  const checklistRef = useRef(null);
  const [checklistWidth, setChecklistWidth] = useState(0);
  const [checklistHeight, setChecklistHeight] = useState(0);

  const [loading, setLoading] = useState(true); // For Firestore loading
  const [error, setError] = useState(null); // For Firestore errors

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

  // Remove all localStorage useEffects as data will be fetched from Firestore
  // useEffect(() => {
  //   if (user) {
  //     let taskString = localStorage.getItem(`tasks_${user.uid}`);
  //     let listString = localStorage.getItem(`lists_${user.uid}`);
  //     let archivedTaskString = localStorage.getItem(`archivedTasks_${user.uid}`);
  //     let archivedListString = localStorage.getItem(`archivedLists_${user.uid}`);

  //     setTasks(taskString ? JSON.parse(taskString) : []);
  //     setLists(listString ? JSON.parse(listString) : []);
  //     setArchivedTasks(archivedTaskString ? JSON.parse(archivedTaskString) : []);
  //     setArchivedLists(archivedListString ? JSON.parse(archivedListString) : []);
  //   } else {
  //     setTasks([]);
  //     setLists([]);
  //     setArchivedTasks([]);
  //     setArchivedLists([]);
  //   }
  // }, [user]);

  // useEffect(() => {
  //   if (user) {
  //     localStorage.setItem(`tasks_${user.uid}`, JSON.stringify(tasks));
  //   }
  // }, [tasks, user]);

  // useEffect(() => {
  //   if (user) {
  //     localStorage.setItem(`lists_${user.uid}`, JSON.stringify(lists));
  //   }
  // }, [lists, user]);

  // useEffect(() => {
  //   if (user) {
  //     localStorage.setItem(`archivedTasks_${user.uid}`, JSON.stringify(archivedTasks));
  //   }
  // }, [archivedTasks, user]);

  // useEffect(() => {
  //   if (user) {
  //     localStorage.setItem(`archivedLists_${user.uid}`, JSON.stringify(archivedLists));
  //   }
  // }, [archivedLists, user]);


  // Firestore Listeners
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLists([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const tasksCollectionRef = collection(db, 'tasks');
    const listsCollectionRef = collection(db, 'lists');

    // Query for tasks assigned to the current user
    const qTasks = query(tasksCollectionRef, where('assignedTo', '==', user.uid));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(fetchedTasks);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching tasks:", err);
      setError("Failed to load tasks. Please try again.");
      setLoading(false);
    });

    // Query for lists assigned to the current user
    const qLists = query(listsCollectionRef, where('assignedTo', '==', user.uid));
    const unsubscribeLists = onSnapshot(qLists, (snapshot) => {
      const fetchedLists = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setLists(fetchedLists);
      setLoading(false); // Can be set here or after both are loaded
    }, (err) => {
      console.error("Error fetching lists:", err);
      setError("Failed to load lists. Please try again.");
      setLoading(false);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeLists();
    };
  }, [user]); // Re-run when user changes


  const triggerConfetti = () => {
    setShowConfetti(true);
    setConfettiKey(prev => prev + 1);
    setTimeout(() => {
      setShowConfetti(false);
    }, 4000);
  };

  // Firestore operations
  const completeTask = async (id) => {
    try {
      const taskRef = doc(db, 'tasks', id);
      const taskToUpdate = tasks.find(t => t.id === id);

      if (taskToUpdate) {
        const newCompletedStatus = !taskToUpdate.completed;
        const updates = {
          completed: newCompletedStatus,
          lastModifiedAt: serverTimestamp(),
          archived: newCompletedStatus ? true : false, // Archive if completed
          archivedAt: newCompletedStatus ? new Date().toISOString() : null,
          archivedReason: newCompletedStatus ? 'completed' : null
        };
        await updateDoc(taskRef, updates);
        if (newCompletedStatus) {
          triggerConfetti();
        }
      }
    } catch (err) {
      console.error("Error completing task:", err);
      setError("Failed to update task status.");
    }
  };

  const archiveTask = async (id) => {
    try {
      const taskRef = doc(db, 'tasks', id);
      await updateDoc(taskRef, {
        archived: true,
        archivedAt: new Date().toISOString(),
        archivedReason: 'deleted',
        lastModifiedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error archiving task:", err);
      setError("Failed to archive task.");
    }
  };

  const restoreTask = async (id) => {
    try {
      const taskRef = doc(db, 'tasks', id);
      await updateDoc(taskRef, {
        archived: false,
        completed: false, // Restore as incomplete
        archivedAt: null,
        archivedReason: null,
        lastModifiedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error restoring task:", err);
      setError("Failed to restore task.");
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (err) {
      console.error("Error deleting task:", err);
      setError("Failed to delete task.");
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

  const handleSaveNote = async () => {
    try {
      if (editingNoteListId) {
        // Find the list and the specific task within it to update
        const listToUpdate = lists.find(list => list.id === editingNoteListId);
        if (listToUpdate) {
          const updatedTasks = listToUpdate.tasks.map(task =>
            task.id === editingNoteTaskId ? { ...task, note: currentNoteText } : task
          );
          const listRef = doc(db, 'lists', editingNoteListId);
          await updateDoc(listRef, {
            tasks: updatedTasks, // Update the entire tasks array in the list document
            lastModifiedAt: serverTimestamp()
          });
        }
      } else if (editingNoteTaskId) {
        const taskRef = doc(db, 'tasks', editingNoteTaskId);
        await updateDoc(taskRef, {
          note: currentNoteText,
          lastModifiedAt: serverTimestamp()
        });
      }
      handleCloseNotes();
    } catch (err) {
      console.error("Error saving note:", err);
      setError("Failed to save note.");
    }
  };

  const completeList = async (id) => {
    try {
      const listRef = doc(db, 'lists', id);
      const listToUpdate = lists.find(l => l.id === id);

      if (listToUpdate) {
        const newCompletedStatus = !listToUpdate.completed;
        const updates = {
          completed: newCompletedStatus,
          lastModifiedAt: serverTimestamp(),
          archived: newCompletedStatus ? true : false, // Archive list if completed
          archivedAt: newCompletedStatus ? new Date().toISOString() : null,
          archivedReason: newCompletedStatus ? 'completed' : null
        };

        // If completing the list, also mark all its tasks as completed and archived
        if (newCompletedStatus && listToUpdate.tasks) {
          updates.tasks = listToUpdate.tasks.map(task => ({
            ...task,
            completed: true,
            archived: true // Also archive tasks within a completed list
          }));
          triggerConfetti();
        } else if (!newCompletedStatus && listToUpdate.tasks) {
           // If un-completing list, un-complete and un-archive its tasks
           updates.tasks = listToUpdate.tasks.map(task => ({
            ...task,
            completed: false,
            archived: false
          }));
        }

        await updateDoc(listRef, updates);
      }
    } catch (err) {
      console.error("Error completing list:", err);
      setError("Failed to update list status.");
    }
  };

  const archiveList = async (id) => {
    try {
      const listRef = doc(db, 'lists', id);
      await updateDoc(listRef, {
        archived: true,
        archivedAt: new Date().toISOString(),
        archivedReason: 'deleted',
        lastModifiedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error archiving list:", err);
      setError("Failed to archive list.");
    }
  };

  const restoreList = async (id) => {
    try {
      const listRef = doc(db, 'lists', id);
      const listToUpdate = lists.find(l => l.id === id);

      if (listToUpdate) {
        const updates = {
          archived: false,
          completed: false, // Restore as incomplete
          archivedAt: null,
          archivedReason: null,
          lastModifiedAt: serverTimestamp()
        };

        // Also restore tasks within the list
        if (listToUpdate.tasks) {
          updates.tasks = listToUpdate.tasks.map(task => ({
            ...task,
            archived: false,
            completed: false
          }));
        }
        await updateDoc(listRef, updates);
      }
    } catch (err) {
      console.error("Error restoring list:", err);
      setError("Failed to restore list.");
    }
  };

  const handleDeleteList = async (id) => {
    try {
      await deleteDoc(doc(db, 'lists', id));
    } catch (err) {
      console.error("Error deleting list:", err);
      setError("Failed to delete list.");
    }
  };

  const completeTaskInList = async (listId, taskId) => {
    try {
      const listRef = doc(db, 'lists', listId);
      const listToUpdate = lists.find(l => l.id === listId);

      if (listToUpdate) {
        const updatedTasks = listToUpdate.tasks.map(task => {
          if (task.id === taskId) {
            const newCompletedStatus = !task.completed;
            if (newCompletedStatus) {
              triggerConfetti();
            }
            return { ...task, completed: newCompletedStatus, archived: newCompletedStatus ? true : false }; // Archive task if completed
          }
          return task;
        });

        // Check if all tasks in the list are completed
        const allTasksCompleted = updatedTasks.every(task => task.completed);

        await updateDoc(listRef, {
          tasks: updatedTasks,
          completed: allTasksCompleted, // Update list completed status based on its tasks
          lastModifiedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error completing task in list:", err);
      setError("Failed to update task in list.");
    }
  };

  const archiveTaskInList = async (listId, taskId) => {
    try {
      const listRef = doc(db, 'lists', listId);
      const listToUpdate = lists.find(l => l.id === listId);

      if (listToUpdate) {
        const updatedTasks = listToUpdate.tasks.map(task => {
          if (task.id === taskId) {
            return { ...task, archived: true };
          }
          return task;
        });
        await updateDoc(listRef, {
          tasks: updatedTasks,
          lastModifiedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error archiving task in list:", err);
      setError("Failed to archive task in list.");
    }
  };

  const restoreTaskInList = async (listId, taskId) => {
    try {
      const listRef = doc(db, 'lists', listId);
      const listToUpdate = lists.find(l => l.id === listId);

      if (listToUpdate) {
        const updatedTasks = listToUpdate.tasks.map(task => {
          if (task.id === taskId) {
            return { ...task, archived: false, completed: false };
          }
          return task;
        });
        await updateDoc(listRef, {
          tasks: updatedTasks,
          lastModifiedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error restoring task in list:", err);
      setError("Failed to restore task in list.");
    }
  };

  const handleDeleteTaskInList = async (listId, taskId) => {
    try {
      const listRef = doc(db, 'lists', listId);
      const listToUpdate = lists.find(l => l.id === listId);

      if (listToUpdate) {
        const updatedTasks = listToUpdate.tasks.filter(task => task.id !== taskId);
        await updateDoc(listRef, {
          tasks: updatedTasks,
          lastModifiedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error deleting task in list:", err);
      setError("Failed to delete task in list.");
    }
  };

  // Derive archivedTasks and archivedLists from the main tasks and lists states
  const activeTasks = tasks.filter(task => !task.archived);
  const archivedTasksState = tasks.filter(task => task.archived); // Renamed to avoid clash with function
  const activeLists = lists.filter(list => !list.archived);
  const archivedListsState = lists.filter(list => list.archived); // Renamed to avoid clash with function


  // Adjusted filtering to use active/archived states derived from Firestore data
  const filteredTasks = (showArchived ? archivedTasksState : activeTasks).filter(task =>
    (task.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.note && task.note.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const filteredLists = (showArchived ? archivedListsState : activeLists).filter(list =>
    (list.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (list.tasks && list.tasks.some(task =>
        task.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.note && task.note.toLowerCase().includes(searchQuery.toLowerCase()))
      )))
  );


  const totalMainTasks = filteredTasks.length;
  const completedMainTasks = filteredTasks.filter(t => t.completed).length;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // No need to clear local storage items related to tasks/lists/archives anymore as data is in Firestore
      console.log("User logged out.");
      setShowAccountModal(false);
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  };

  // Pass archived tasks and lists to ArchiveModal for display
  const allArchivedItems = [...archivedTasksState.map(t => ({...t, type: 'task'})), ...archivedListsState.map(l => ({...l, type: 'list'}))];


  return (
    <div className="checklist-content" ref={checklistRef}>
      <div className="app-header">
        <h1 className="app-title">Secure Checklist</h1>
        {user && (
          <div className="user-account-section">
            <button
              onClick={() => setShowAccountModal(true)}
              className="account-button"
              title="My Account"
            >
              <span style={{ fontSize: '2em', lineHeight: '1em' }}>👤</span>
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

      {loading && <p className="loading-message">Loading tasks and lists...</p>}
      {error && <p className="error-message">{error}</p>}

      {!loading && !error && (
        <div className="content-area">
          {(filteredTasks.length > 0 || !showArchived) && ( // Show section if there are tasks or if not showing archived (to show empty state)
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
                    onDelete={handleDeleteTask} // Pass delete handler
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

          {(filteredLists.length > 0 || !showArchived) && ( // Show section if there are lists or if not showing archived (to show empty state)
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
                    onDeleteList={handleDeleteList} // Pass delete list handler
                    onArchiveTaskInList={archiveTaskInList}
                    onRestoreTaskInList={restoreTaskInList}
                    onDeleteTaskInList={handleDeleteTaskInList} // Pass delete task in list handler
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
      )}


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
          onSignOut={handleLogout}
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