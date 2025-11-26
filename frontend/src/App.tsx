import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

function App() {
  useEffect(() => {
    socket = io(BACKEND_URL, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      // Example: join a workspace room
      socket?.emit('join-room', 'workspace:demo');
    });

    return () => {
      socket?.disconnect();
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>CollabBoards</h1>
        <span className="app-subtitle">Real-time project boards & docs</span>
      </header>
      <main className="app-main">
        <aside className="sidebar">
          <h2>Workspaces</h2>
          <div className="workspace-tile workspace-tile--active">
            Demo Workspace
          </div>
          <button className="primary-button">+ New workspace</button>
        </aside>
        <section className="board-section">
          <header className="board-header">
            <h2>Demo Board</h2>
            <button className="secondary-button">Invite</button>
          </header>
          <div className="board-lists">
            <div className="board-list">
              <h3>To Do</h3>
              <div className="card">Set up backend skeleton</div>
              <div className="card">Design workspace/board schema</div>
              <button className="ghost-button">+ Add card</button>
            </div>
            <div className="board-list">
              <h3>In Progress</h3>
              <div className="card">Implement auth & RBAC</div>
            </div>
            <div className="board-list">
              <h3>Done</h3>
              <div className="card">Create project skeleton</div>
            </div>
          </div>
        </section>
        <aside className="details-panel">
          <h2>Card details</h2>
          <p>Select a card to view its mini doc & activity.</p>
        </aside>
      </main>
    </div>
  );
}

export default App;


