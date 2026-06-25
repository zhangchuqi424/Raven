import MessageList from './MessageList'
import InputBox from './InputBox'
import './ChatPanel.css'

export default function ChatPanel() {
  return (
    <div className="chat-panel">
      <MessageList />
      <InputBox />
    </div>
  )
}
