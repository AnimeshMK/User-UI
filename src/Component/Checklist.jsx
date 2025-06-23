// src/Component/Checklist.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckSquare, List, Check, StickyNote, Archive, RotateCcw } from 'lucide-react';
// Removed DatePicker import as it's no longer used for adding deadlines
// Removed 'react-datepicker/dist/react-datepicker.css' import as DatePicker is no longer used

// Importing the single combined App.css
import '../App.css'; // Path is relative to src/Component/

// Import Confetti component
import Confetti from 'react-confetti';

// --- Internal ProgressBar Component ---
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

// --- Internal Notes Component ---
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

// --- Internal Task Component ---
const Task = ({ task, onComplete, onOpenNotes, onArchive, onRestore }) => {
  const [deadlineStatusClass, setDeadlineStatusClass] = useState('');

  useEffect(() => {
    let intervalId;

    const updateDeadlineStatus = () => {
      // If task is completed or has no deadline, no special deadline class
      if (task.completed || !task.deadline) {
        setDeadlineStatusClass('');
        if (intervalId) clearInterval(intervalId);
        return;
      }

      const now = new Date().getTime();
      const deadlineTime = new Date(task.deadline).getTime();
      const timeRemaining = deadlineTime - now; // in milliseconds

      const oneHour = 60 * 60 * 1000;
      const oneDay = 24 * oneHour;

      let newClass = '';
      if (timeRemaining <= 0) {
        newClass = 'red-shadow-crossed';
        if (intervalId) clearInterval(intervalId); // Stop checking once deadline is crossed
      } else if (timeRemaining <= oneHour) {
        newClass = 'blink-red-shadow';
      } else if (timeRemaining <= oneDay) { // More than 1 hour, but less than or equal to 1 day
        newClass = 'blink-yellow-shadow';
      }
      setDeadlineStatusClass(newClass);
    };

    updateDeadlineStatus(); // Initial check

    // Set interval to update status more frequently for time-sensitive changes
    intervalId = setInterval(updateDeadlineStatus, 30 * 1000); // Check every 30 seconds

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [task.deadline, task.completed]); // Re-run effect if deadline or completed status changes

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

        {/* Display Assigned Time and Deadline below the task content */}
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

// --- Internal TodoList Component ---
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
            className={`checkbox ${list.completed ? "checked" : ""}`}
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
const Checklist = () => {
  // --- State Management ---
  const [tasks, setTasks] = useState([]);
  const [lists, setLists] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [archivedLists, setArchivedLists] = useState([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Notes Modal State
  const [editingNoteTaskId, setEditingNoteTaskId] = useState(null);
  const [editingNoteListId, setEditingNoteListId] = useState(null);
  const [currentNoteText, setCurrentNoteText] = useState('');

  // Confetti State
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0); // Key to force re-render/re-trigger confetti

  // Ref for the .app container to get its dimensions for confetti
  const appRef = useRef(null);
  const [appWidth, setAppWidth] = useState(0);
  const [appHeight, setAppHeight] = useState(0);

  // --- Effect to get app container dimensions ---
  useEffect(() => {
    const handleResize = () => {
      if (appRef.current) {
        setAppWidth(appRef.current.offsetWidth);
        setAppHeight(appRef.current.offsetHeight);
      }
    };

    // Set initial dimensions
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array means this runs once on mount and on unmount for cleanup


  // --- Local Storage Effects ---
  useEffect(() => {
    let taskString = localStorage.getItem("tasks")
    let listString = localStorage.getItem("lists")
    let archivedTaskString = localStorage.getItem("archivedTasks")
    let archivedListString = localStorage.getItem("archivedLists")

    if (taskString) {
      let tasks = JSON.parse(taskString)
      setTasks(tasks)
    }

    if (listString) {
      let lists = JSON.parse(listString)
      setLists(lists)
    }

    if (archivedTaskString) {
      let archivedTasks = JSON.parse(archivedTaskString)
      setArchivedTasks(archivedTasks)
    }

    if (archivedListString) {
      let archivedLists = JSON.parse(archivedListString)
      setArchivedLists(archivedLists)
    }

    setIsDataLoaded(true);
  }, [])

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem("tasks", JSON.stringify(tasks))
    }
  }, [tasks, isDataLoaded])

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem("lists", JSON.stringify(lists))
    }
  }, [lists, isDataLoaded])

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem("archivedTasks", JSON.stringify(archivedTasks))
    }
  }, [archivedTasks, isDataLoaded])

  useEffect(() => {
    if (isDataLoaded) {
      localStorage.setItem("archivedLists", JSON.stringify(archivedLists))
    }
  }, [archivedLists, isDataLoaded])

  // --- Confetti Trigger Function ---
  const triggerConfetti = () => {
    setShowConfetti(true);
    setConfettiKey(prev => prev + 1); // Increment key to force confetti re-render
    setTimeout(() => {
      setShowConfetti(false);
    }, 4000); // Confetti lasts for 4 seconds
  };

  // --- Task Functions (Complete, Archive, Restore) ---
  const completeTask = (id) => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === id) {
        const updatedTask = { ...task, completed: !task.completed };
        if (updatedTask.completed) {
          triggerConfetti();
          // Move to archivedTasks if completed
          setArchivedTasks(prevArchived => [...prevArchived, { ...updatedTask, archived: true }]);
          return null; // Mark for removal from current tasks
        }
        return updatedTask;
      }
      return task;
    }).filter(task => task !== null)); // Filter out nulls (completed and moved tasks)
  };

  const archiveTask = (id) => {
    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === id) {
        // Move to archivedTasks
        setArchivedTasks(prevArchived => [...prevArchived, { ...task, archived: true }]);
        return null; // Mark for removal from current tasks
      }
      return task;
    }).filter(task => task !== null)); // Filter out nulls (archived tasks)
  };

  const restoreTask = (id) => {
    setArchivedTasks(prevArchived => prevArchived.map(task => {
      if (task.id === id) {
        // Move back to tasks
        setTasks(prevTasks => [...prevTasks, { ...task, archived: false }]);
        return null; // Mark for removal from archived tasks
      }
      return task;
    }).filter(task => task !== null)); // Filter out nulls (restored tasks)
  };

  // --- Notes Management Functions ---
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
      // Save note for a task within a list
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
      // Also check archived lists for the task
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
      // Save note for a standalone task
      setTasks(tasks.map(task =>
        task.id === editingNoteTaskId ? { ...task, note: currentNoteText } : task
      ));
      // Also check archived tasks
      setArchivedTasks(prevArchivedTasks => prevArchivedTasks.map(task =>
        task.id === editingNoteTaskId ? { ...task, note: currentNoteText } : task
      ));
    }
    handleCloseNotes(); // Close modal after saving
  };

  // --- List Functions (Complete, Archive, Restore) ---
  const completeList = (id) => {
    setLists(prevLists => prevLists.map(list => {
      if (list.id === id) {
        const updatedList = { ...list, completed: !list.completed };
        if (updatedList.completed) {
          triggerConfetti();
          // Mark all tasks in the list as completed
          updatedList.tasks = updatedList.tasks.map(task => ({ ...task, completed: true }));
          // Move to archivedLists if completed
          setArchivedLists(prevArchived => [...prevArchived, { ...updatedList, archived: true }]);
          return null; // Mark for removal from current lists
        }
        return updatedList;
      }
      return list;
    }).filter(list => list !== null)); // Filter out nulls (completed and moved lists)
  };

  const archiveList = (id) => {
    setLists(prevLists => prevLists.map(list => {
      if (list.id === id) {
        // Move to archivedLists
        setArchivedLists(prevArchived => [...prevArchived, { ...list, archived: true }]);
        return null; // Mark for removal from current lists
      }
      return list;
    }).filter(list => list !== null)); // Filter out nulls (archived lists)
  };

  const restoreList = (id) => {
    setArchivedLists(prevArchived => prevArchived.map(list => {
      if (list.id === id) {
        // Move back to lists
        setLists(prevLists => [...prevLists, { ...list, archived: false }]);
        return null; // Mark for removal from archived lists
      }
      return list;
    }).filter(list => list !== null)); // Filter out nulls (restored lists)
  };

  const completeTaskInList = (listId, taskId) => {
    setLists(prevLists => prevLists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          tasks: list.tasks.map(task => {
            if (task.id === taskId) {
              const updatedTask = { ...task, completed: !task.completed };
              if (updatedTask.completed) {
                triggerConfetti();
                // Move to archivedTasks *within* the list if completed
                return { ...updatedTask, archived: true }; // Mark as archived within the list structure
              }
              return updatedTask;
            }
            return task;
          })
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
    setArchivedLists(prevArchivedLists => prevArchivedLists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          tasks: list.tasks.map(task => {
            if (task.id === taskId) {
              return { ...task, archived: false };
            }
            return task;
          })
        };
      }
      return list;
    }));
    // Also add it back to the active list if it was a task in a list that was restored.
    setLists(prevLists => prevLists.map(list => {
      if (list.id === listId) {
        const taskToRestore = archivedLists.find(al => al.id === listId)?.tasks.find(t => t.id === taskId);
        if (taskToRestore && !list.tasks.some(t => t.id === taskId)) {
          return {
            ...list,
            tasks: [...list.tasks, { ...taskToRestore, archived: false }]
          };
        }
      }
      return list;
    }));
  };

  // --- Filtering Logic ---
  const allTasks = [...tasks, ...archivedTasks];
  const allLists = [...lists, ...archivedLists];

  const filteredTasks = allTasks.filter(task =>
    (showArchived ? task.archived : !task.archived) && // Filter based on showArchived state
    (task.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.note && task.note.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const filteredLists = allLists.filter(list =>
    (showArchived ? list.archived : !list.archived) && // Filter based on showArchived state
    (list.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      list.tasks.some(task =>
        task.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.note && task.note.toLowerCase().includes(searchQuery.toLowerCase()))
      ))
  );

  // Calculate completed and total for main tasks section
  const totalMainTasks = filteredTasks.length;
  const completedMainTasks = filteredTasks.filter(t => t.completed).length;


  return (
    <div className="app" ref={appRef}> {/* Attach ref to the outermost blur bubble */}
      <div className="app-header">
        <h1 className="app-title">Secure Checklist</h1>
      </div>

      {/* Search Bar */}
      <div className="add-form"> {/* Reusing add-form class for styling convenience */}
        <Search size={20} color="#a8dadc" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks or lists..."
          className="main-input" // Reusing main-input for styling
        />
        <button onClick={() => setShowArchived(!showArchived)} className="toggle-archive-btn">
          {showArchived ? "Show Active" : "Show Archived"}
        </button>
      </div>

      <div className="content-area">
        {/* Tasks Section */}
        {filteredTasks.length > 0 && (
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
            {/* Add ProgressBar for Tasks Section */}
            {totalMainTasks > 0 && (
              <ProgressBar completedTask={completedMainTasks} total={totalMainTasks} onCompleteList={false} />
            )}
          </div>
        )}

        {/* Lists Section */}
        {filteredLists.length > 0 && (
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
          </div>
        )}

        {/* Empty State for search results or no data */}
        {filteredTasks.length === 0 && filteredLists.length === 0 && (
          <div className="empty-state">
            <p>No matching tasks or lists found.</p>
          </div>
        )}
      </div>

      {/* Notes Modal - Rendered globally based on editingNoteTaskId */}
      {(editingNoteTaskId !== null) && (
        <Notes
          noteText={currentNoteText}
          onChange={setCurrentNoteText}
          onClose={handleCloseNotes}
          onSave={handleSaveNote}
        />
      )}

      {/* Confetti Component - Left Side */}
      {showConfetti && appWidth > 0 && appHeight > 0 && (
        <Confetti
          key={`left-confetti-${confettiKey}`} // Unique key for left confetti
          width={appWidth}
          height={appHeight}
          recycle={false}
          numberOfPieces={125} // Half the total pieces for each side
          gravity={0.15}
          wind={0.05} // Blows slightly right
          confettiSource={{
            x: 0, // Start from the extreme left edge
            y: 0,
            w: 50, // Narrow strip for left side
            h: appHeight, // Span full height of the app container
          }}
          tweenDuration={4000}
          colors={['#a8dadc', '#61dafb', '#f2b5d4', '#e0e0e0', '#87ceeb']}
        />
      )}

      {/* Confetti Component - Right Side */}
      {showConfetti && appWidth > 0 && appHeight > 0 && (
        <Confetti
          key={`right-confetti-${confettiKey}`} // Unique key for right confetti
          width={appWidth}
          height={appHeight}
          recycle={false}
          numberOfPieces={125} // Half the total pieces for each side
          gravity={0.15}
          wind={-0.05} // Blows slightly left
          confettiSource={{
            x: appWidth - 50, // Start from the extreme right edge
            y: 0,
            w: 50, // Narrow strip for right side
            h: appHeight, // Span full height of the app container
          }}
          tweenDuration={4000}
          colors={['#a8dadc', '#61dafb', '#f2b5d4', '#e0e0e0', '#87ceeb']}
        />
      )}
    </div>
  );
};

export default Checklist;