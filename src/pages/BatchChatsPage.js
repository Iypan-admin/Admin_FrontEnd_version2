import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { createChatMessage, fetchChatMessages, deleteChatMessage, updateChatMessage } from '../services/Api';
import { MessageCircle, Send, Edit3, Trash2, Clock, User, Bot, Loader2 } from 'lucide-react';

function BatchChatsPage() {
  const { batchId } = useParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');

  // Fetch messages when component mounts
  useEffect(() => {
    const loadMessages = async (isInitialLoad = false) => {
      try {
        if (isInitialLoad) {
        setLoading(true);
        }
        const data = await fetchChatMessages(batchId);
        setMessages(data || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError('Failed to load chat messages');
      } finally {
        if (isInitialLoad) {
        setLoading(false);
        }
      }
    };

    if (batchId) {
      // Initial load with loading state
      loadMessages(true);
      
      // Set up polling for real-time updates every 5 seconds (without loading state)
      const interval = setInterval(() => {
        loadMessages(false);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [batchId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      // Get user_id from token
      const token = localStorage.getItem("token");
      const decodedToken = token ? JSON.parse(atob(token.split(".")[1])) : null;
      const userId = decodedToken?.id || null;

      const chatData = {
        text: message.trim(),
        batch_id: batchId,
        sender: 'teacher',
        user_id: userId
      };

      const response = await createChatMessage(chatData);
      
      // Clear input first
      setMessage('');
      
      // Add the new message to the messages array immediately
      if (response && response.success && response.data) {
        setMessages(prevMessages => [...prevMessages, response.data]);
      }
      
      // Then fetch all messages to ensure synchronization
      const updatedMessages = await fetchChatMessages(batchId);
      setMessages(updatedMessages);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      const response = await deleteChatMessage(messageId);

      // Check for the 'message' property instead of 'success'
      if (response && response.message) {
        setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
      } else {
        throw new Error(response.error || 'Failed to delete message');
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      alert('Failed to delete message');
    }
  };

  const handleEditClick = (msg) => {
    setEditingMessage(msg.id);
    setEditText(msg.text);
  };

  const handleEditSubmit = async (messageId) => {
    if (!editText.trim()) return;
    
    try {
      const updateData = {
        text: editText.trim(),
        batch_id: batchId
      };
      
      await updateChatMessage(messageId, updateData);
      
      // Update local messages state
      setMessages(messages.map(msg => 
        msg.id === messageId ? {...msg, text: editText.trim()} : msg
      ));
      
      // Exit edit mode
      setEditingMessage(null);
      setEditText('');
    } catch (err) {
      console.error('Error updating message:', err);
      alert('Failed to update message');
    }
  };

  if (loading && messages.length === 0) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex overflow-hidden">
        <Navbar />
        <div className="flex-1 lg:ml-64 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
          <div className="p-3 sm:p-4 lg:p-6 xl:p-8 min-h-full">
            <div className="mt-16 lg:mt-0">
              <div className="max-w-7xl mx-auto">
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-800">Loading Chat Messages</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex overflow-hidden">
      <Navbar />
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 min-h-full">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto">
              {/* Enhanced Header */}
              <div className="mb-6 sm:mb-8">
                <div className="flex items-center space-x-3 sm:space-x-4 mb-4">
                  <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Batch Chat
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">
                      Communicate with your batch students
                    </p>
                  </div>
                </div>
                
                {error && (
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <MessageCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-red-800">Connection Error</h4>
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Chat Container */}
              <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 flex flex-col h-[calc(100vh-12rem)]">
                {/* Chat Messages Area */}
                <div className="flex-grow p-4 sm:p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                      <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-blue-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                        <MessageCircle className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                      </div>
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No Messages Yet</h4>
                      <p className="text-gray-500 text-sm sm:text-base text-center max-w-md">
                        Start the conversation by sending your first message to the batch
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4 sm:space-y-6">
                      {messages.map((msg, index) => (
                        <div 
                          key={msg.id}
                          className={`flex ${msg.sender === 'teacher' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                          style={{ animationDelay: `${index * 100}ms` }}
                        >
                          <div className={`max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] rounded-2xl p-4 sm:p-5 relative shadow-lg hover:shadow-xl transition-all duration-200 ${
                            msg.sender === 'teacher' 
                              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900'
                          }`}>
                            {editingMessage === msg.id ? (
                              <div className="flex flex-col space-y-3">
                                <textarea
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="w-full p-3 border border-white/30 rounded-xl text-gray-800 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 bg-white/90 backdrop-blur-sm resize-none"
                                  rows="3"
                                  placeholder="Edit your message..."
                                />
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={() => setEditingMessage(null)}
                                    className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all duration-200 font-medium"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleEditSubmit(msg.id)}
                                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all duration-200 font-medium shadow-lg"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-start space-x-2">
                                  <div className={`p-1.5 rounded-lg ${
                                    msg.sender === 'teacher' 
                                      ? 'bg-white/20' 
                                      : 'bg-blue-100'
                                  }`}>
                                    {msg.sender === 'teacher' ? (
                                      <User className="w-4 h-4" />
                                    ) : (
                                      <Bot className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm sm:text-base leading-relaxed break-words">{msg.text}</p>
                                    <div className="flex items-center justify-between mt-2">
                                      <span className={`text-xs flex items-center space-x-1 ${
                                        msg.sender === 'teacher' 
                                          ? 'text-white/70' 
                                          : 'text-gray-500'
                                      }`}>
                                        <Clock className="w-3 h-3" />
                                        <span>{new Date(msg.created_at || msg.timestamp).toLocaleTimeString()}</span>
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Action buttons for teacher's messages */}
                                {msg.sender === 'teacher' && !editingMessage && (
                                  <div className="flex mt-3 justify-end space-x-2">
                                    <button
                                      onClick={() => handleEditClick(msg)}
                                      className="px-3 py-1.5 text-xs bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all duration-200 flex items-center space-x-1"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteMessage(msg.id)}
                                      className="px-3 py-1.5 text-xs bg-red-500/20 text-white rounded-lg hover:bg-red-500/30 transition-all duration-200 flex items-center space-x-1"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Enhanced Message Input Area */}
                <div className="border-t border-gray-200/50 p-4 sm:p-6 bg-gradient-to-r from-gray-50/50 to-blue-50/50 backdrop-blur-sm">
                  <form onSubmit={handleSubmit} className="flex gap-3">
                    <div className="flex-grow relative">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="w-full p-3 sm:p-4 pr-12 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <MessageCircle className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!message.trim()}
                      className={`px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2 ${
                        message.trim() 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">Send</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatchChatsPage;