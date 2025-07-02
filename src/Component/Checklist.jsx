// src/Component/Checklist.jsx (UPDATED CONTENT)

import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckSquare, List, Check, StickyNote, Archive, LogOut, RotateCcw, Trash2 } from 'lucide-react'; // Added RotateCcw and Trash2 import
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebaseConfig'; // Import db
import { collection, addDoc, updateDoc, deleteDoc, query, where, onSnapshot, doc, serverTimestamp, arrayUnion, arrayRemove, getDocs } from 'firebase/firestore'; // Import Firestore functions

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
            disabled={task.archived}
            title={task.archived ? "Archived task cannot be updated" : "Mark as completed"}
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
              Deadline: {new Date(task.deadline.toDate()).toLocaleString()}
            </div>
          )}
        </div>
      </div>

      <div className="task-actions">
        <button
          onClick={() => onOpenNotes(task.id, task.note)}
          className="note-btn"
          disabled={task.archived}
          title={task.archived ? "Archived task cannot be edited" : "Open notes"}
        >
          <StickyNote size={16} />
        </button>
        {task.archived ? (
          <>
            <button onClick={() => onRestore(task.id)} className="archive-btn">
              <RotateCcw size={16} />
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


  //Firestore Listeners
  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLists([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const userDocRef = collection(db, 'users');
    const q = query(userDocRef, where('id', '==', user.uid)); // Match your 'id' field in Firestore user doc

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();

        // Fetch nested arrays
        const fetchedTasks = docData.tasks || [];
        const fetchedLists = Array.isArray(docData.lists) ? docData.lists : [];

        // assumes task and tasks array as the same
        const normalizedLists = fetchedLists.map(list => ({
          ...list,
          tasks: Array.isArray(list.tasks)
            ? list.tasks
            : Array.isArray(list.task)
              ? list.task
              : []
        }));
        setLists(normalizedLists); // setting tasks as tasks or task

        setTasks(fetchedTasks);
        // setLists(fetchedLists);
        console.log("Fetched Tasks:", fetchedTasks);
        console.log("Fetched Lists:", fetchedLists);
      } else {
        console.warn("No matching user document found.");
        setTasks([]);
        setLists([]);
      }

      setLoading(false);
    }, (err) => {
      console.error("Error fetching user data:", err);
      setError("Failed to load user data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);


  // async function fetchUsersFromFirebase() {
  //   try {
  //     const usersCollection = collection(db, "users");
  //     const querySnapshot = await getDocs(usersCollection);

  //     if (querySnapshot.empty) {
  //       console.log("No users found in the database");
  //       return [];
  //     }

  //     const users = [];
  //     querySnapshot.forEach((docSnap) => {
  //       const data = docSnap.data();

  //       // More comprehensive validation
  //       if (data && typeof data === 'object') {
  //         users.push({
  //           docId: docSnap.id,
  //           id: data.id || docSnap.id, 
  //           name: data.name || data.fullName ||'Unknown',
  //           tasks: data.tasks  ||[],
  //           lists: data.lists  ||[],
  //           completed: data.completed || false,
  //           visible: data.visible !== false, 
  //           notes: data.notes || ''
  //         });
  //       }
  //     });

  //     console.log(`Fetched ${users.length} users from Firebase:`, users);
  //     setLists(users);
  //     return users;
  //   } catch (error) {
  //     console.error("Error fetching users from Firebase:", error);
  //     return [];
  //   }
  // }

  // fetchUsersFromFirebase();

  const triggerConfetti = () => {
    setShowConfetti(true);
    setConfettiKey(prev => prev + 1);
    setTimeout(() => {
      setShowConfetti(false);
    }, 4000);
  };

  // Firestore operations
  const completeTask = async (taskId) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const tasks = userDoc.data().tasks || [];

        const updatedTasks = tasks.map(task =>
          task.id === taskId ? { ...task, completed: !task.completed } : task
        );

        const userDocRef = doc(db, 'users', userDoc.id);
        await updateDoc(userDocRef, { tasks: updatedTasks });

        console.log("Task completion status updated in Firestore.");
      }
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const archiveTask = async (taskId) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userDocRef = doc(db, 'users', userDoc.id);
        const currentTasks = userDoc.data().tasks || [];

        const taskToArchive = currentTasks.find(task => task.id === taskId);

        if (!taskToArchive) {
          throw new Error("Task not found.");
        }

        if (!taskToArchive.completed) {
          alert("Only completed tasks can be archived.");
          return;
        }

        const updatedTasks = currentTasks.map(task =>
          task.id === taskId
            ? {
              ...task,
              archived: true,
              archivedAt: new Date().toISOString(),
              archivedReason: 'completed',
            }
            : task
        );

        await updateDoc(userDocRef, {
          tasks: updatedTasks,
          lastModifiedAt: serverTimestamp(),
        });

        console.log("Task archived successfully.");
      } else {
        throw new Error("User document not found.");
      }
    } catch (err) {
      console.error("Error archiving task:", err);
      setError("Failed to archive task.");
    }
  };

  const restoreTask = async (taskId) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const currentTasks = userDoc.data().tasks || [];

        const updatedTasks = currentTasks.map(task =>
          task.id === taskId
            ? {
              ...task,
              archived: false,
              archivedAt: null,
              archivedReason: null,
            }
            : task
        );

        await updateDoc(doc(db, 'users', userDoc.id), {
          tasks: updatedTasks,
          lastModifiedAt: serverTimestamp(),
        });

        console.log("Task restored successfully.");
      } else {
        throw new Error("User document not found.");
      }
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
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userDocRef = doc(db, 'users', userDoc.id);

        if (editingNoteListId) { //Notes section for the List
          const currentLists = userDoc.data().lists || [];

          const updatedLists = currentLists.map(list => {
            if (list.id !== editingNoteListId) return list;

            const updatedTasks = (Array.isArray(list.tasks) ? list.tasks : list.task || []).map(task =>
              task.id === editingNoteTaskId ? { ...task, note: currentNoteText } : task
            );

            return {
              ...list,
              tasks: updatedTasks
            };
          });

          await updateDoc(userDocRef, {
            lists: updatedLists,
            lastModifiedAt: serverTimestamp()
          });

        } else if (editingNoteTaskId) { // Notes section for the Tasks
          const currentTasks = userDoc.data().tasks || [];

          const updatedTasks = currentTasks.map(task =>
            task.id === editingNoteTaskId
              ? { ...task, note: currentNoteText }
              : task
          );

          await updateDoc(userDocRef, {
            tasks: updatedTasks,
            lastModifiedAt: serverTimestamp()
          });
        }

        handleCloseNotes();
      }
    } catch (err) {
      console.error("Error saving note:", err);
      setError("Failed to save note.");
    }
  };


  const completeList = async (id) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userDocRef = doc(db, 'users', userDoc.id);
        const currentLists = userDoc.data().lists || [];

        const updatedLists = currentLists.map(list => {
          if (list.id !== id) return list;

          const newCompletedStatus = !list.completed;
          const updatedTasks = (Array.isArray(list.tasks) ? list.tasks : list.task || []).map(task => ({
            ...task,
            completed: newCompletedStatus,
            archived: newCompletedStatus,
            archivedAt: newCompletedStatus ? new Date().toISOString() : null,
            archivedReason: newCompletedStatus ? 'completed' : null
          }));

          if (newCompletedStatus) triggerConfetti();

          return {
            ...list,
            completed: newCompletedStatus,
            archived: newCompletedStatus,
            archivedAt: newCompletedStatus ? new Date().toISOString() : null,
            archivedReason: newCompletedStatus ? 'completed' : null,
            tasks: updatedTasks
          };
        });

        await updateDoc(userDocRef, {
          lists: updatedLists,
          lastModifiedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error completing list:", err);
      setError("Failed to update list status.");
    }
  };

  const archiveList = async (id) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userDocRef = doc(db, 'users', userDoc.id);
        const currentLists = userDoc.data().lists || [];

        const updatedLists = currentLists.map(list => {
          if (list.id !== id) return list;

          return {
            ...list,
            archived: true,
            archivedAt: new Date().toISOString(),
            archivedReason: 'deleted'
          };
        });

        await updateDoc(userDocRef, {
          lists: updatedLists,
          lastModifiedAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error archiving list:", err);
      setError("Failed to archive list.");
    }
  };

  const restoreList = async (id) => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userDocRef = doc(db, 'users', userDoc.id);
        const currentLists = userDoc.data().lists || [];

        const updatedLists = currentLists.map(list => {
          if (list.id !== id) return list;

          const updatedTasks = (Array.isArray(list.tasks) ? list.tasks : list.task || []).map(task => ({
            ...task,
            archived: false,
            completed: false,
            archivedAt: null,
            archivedReason: null
          }));

          return {
            ...list,
            archived: false,
            completed: false,
            archivedAt: null,
            archivedReason: null,
            tasks: updatedTasks
          };
        });

        await updateDoc(userDocRef, {
          lists: updatedLists,
          lastModifiedAt: serverTimestamp()
        });
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
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userDocRef = doc(db, 'users', userDoc.id);
        const currentLists = userDoc.data().lists || [];

        const updatedLists = currentLists.map(list => {
          if (list.id !== listId) return list;

          const updatedTasks = (Array.isArray(list.tasks) ? list.tasks : list.task || []).map(task => {
            if (task.id === taskId) {
              const newCompletedStatus = !task.completed;
              if (newCompletedStatus) triggerConfetti();
              return {
                ...task,
                completed: newCompletedStatus,
                archived: newCompletedStatus
              };
            }
            return task;
          });

          return {
            ...list,
            tasks: updatedTasks,
            completed: updatedTasks.every(t => t.completed)
          };
        });

        await updateDoc(userDocRef, {
          lists: updatedLists,
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
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userDocRef = doc(db, 'users', userDoc.id);
        const currentLists = userDoc.data().lists || [];

        const updatedLists = currentLists.map(list => {
          if (list.id !== listId) return list;

          const updatedTasks = (Array.isArray(list.tasks) ? list.tasks : list.task || []).map(task => {
            if (task.id === taskId) {
              if (!task.completed) {
                alert("Only completed tasks can be archived.");
                return task;
              }
              return {
                ...task,
                archived: true,
                archivedAt: new Date().toISOString(),
                archivedReason: "completed"
              };
            }
            return task;
          });

          return {
            ...list,
            tasks: updatedTasks
          };
        });

        await updateDoc(userDocRef, {
          lists: updatedLists,
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
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', '==', user.uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userDocRef = doc(db, 'users', userDoc.id);
        const currentLists = userDoc.data().lists || [];

        const updatedLists = currentLists.map(list => {
          if (list.id !== listId) return list;

          const updatedTasks = (Array.isArray(list.tasks) ? list.tasks : list.task || []).map(task => {
            if (task.id === taskId) {
              return {
                ...task,
                archived: false,
                archivedAt: null,
                archivedReason: null
              };
            }
            return task;
          });

          return {
            ...list,
            tasks: updatedTasks
          };
        });

        await updateDoc(userDocRef, {
          lists: updatedLists,
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
  const allArchivedItems = [...archivedTasksState.map(t => ({ ...t, type: 'task' })), ...archivedListsState.map(l => ({ ...l, type: 'list' }))];


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