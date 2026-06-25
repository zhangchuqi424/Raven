import SessionSidebar from './components/SessionSidebar'
import TreePanel from './components/TreePanel'
import ChatPanel from './components/ChatPanel'
import './App.css'

export default function App() {
  return (
    <div className="app-layout">
      <SessionSidebar />
      <ChatPanel />
      <TreePanel />
    </div>
  )
}
