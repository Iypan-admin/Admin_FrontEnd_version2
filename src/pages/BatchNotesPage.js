import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { createNote, createNoteWithFiles, getNotes, deleteNote } from '../services/Api';
import { BookOpen, FileText, Calendar, ExternalLink, Download, Eye, Tag, Plus, Trash2, AlertCircle, Loader2, Upload, X, Link2, ChevronLeft } from 'lucide-react';

function BatchNotesPage() {
  const { batchId } = useParams();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [activeTab, setActiveTab] = useState('link'); // 'link' or 'file'
  const [viewingFile, setViewingFile] = useState(null); // { noteId, fileUrl, fileName }

  const [formData, setFormData] = useState({
    title: '',
    note: '',
    link: ''
  });

  const [selectedFiles, setSelectedFiles] = useState([]);

  // Check if file is PDF
  const isPdfFile = (fileUrl) => {
    return fileUrl.toLowerCase().endsWith('.pdf') || fileUrl.includes('.pdf');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const fetchNotes = React.useCallback(async () => {
    try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await getNotes(batchId, token);
        console.log('Notes API Response:', response); // Debug log
        
        // Check if response.data exists and is an array
        if (response && Array.isArray(response)) {
            setNotes(response);
        } else if (response && Array.isArray(response.data)) {
            setNotes(response.data);
        } else {
            console.error('Unexpected response format:', response);
            setError('Invalid data format received');
            setNotes([]);
        }
    } catch (error) {
        console.error('Error fetching notes:', error);
        setError('Failed to load notes');
        setNotes([]);
    } finally {
        setLoading(false);
    }
}, [batchId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]); // Now fetchNotes is memoized and can be safely used as a dependency

  useEffect(() => {
    console.log('Current notes state:', notes);
}, [notes]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const token = localStorage.getItem('token');

      if (activeTab === 'link') {
        // Validate link format
        if (!formData.link || !formData.link.startsWith('https://')) {
          setSubmitError('Please enter a valid HTTPS URL');
          setSubmitting(false);
          return;
        }

        const noteData = {
          link: formData.link,
          batch_id: batchId,
          title: formData.title,
          note: formData.note
        };

        await createNote(noteData, token);
      } else {
        // File post
        if (selectedFiles.length === 0) {
          setSubmitError('Please select at least one file to upload');
          setSubmitting(false);
          return;
        }

        const noteData = {
          batch_id: batchId,
          title: formData.title,
          note: formData.note
        };

        await createNoteWithFiles(noteData, selectedFiles, token);
      }
      
      // Reset form
      setFormData({
        title: '',
        note: '',
        link: ''
      });
      setSelectedFiles([]);

      // Show success message
      alert('Note posted successfully!');

      // Refresh notes list
      fetchNotes();
    } catch (error) {
      setSubmitError(error.message || 'Failed to post note');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
        try {
            const token = localStorage.getItem('token');
            await deleteNote(noteId, token); // Pass the note_id to the delete API
            
            // Refresh the notes list after deletion
            fetchNotes();
        } catch (error) {
            console.error('Error deleting note:', error);
            setError('Failed to delete note: ' + error.message);
        }
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex overflow-hidden">
      <style>{`
        .flip-card {
          perspective: 1000px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }
        .flip-card.flipped .flip-card-inner {
          transform: rotateY(180deg);
        }
      `}</style>
      <Navbar />
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 min-h-full">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto">
              {/* Enhanced Header */}
              <div className="mb-6 sm:mb-8">
                <div className="flex items-center space-x-3 sm:space-x-4 mb-4">
                  <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Course Notes
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 mt-1">
                      Share resources and notes with your batch
                    </p>
                  </div>
                </div>
                
                {error && (
                  <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 sm:p-5 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-red-800">Error Loading Notes</h4>
                        <p className="text-sm text-red-700">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 items-start">
                {/* Enhanced Post Notes Container */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 lg:p-8">
                  <div className="flex items-center space-x-3 mb-6 sm:mb-8">
                    <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg">
                      <Plus className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900">Post New Note</h2>
                      <p className="text-sm text-gray-600">Share resources with your students</p>
                    </div>
                  </div>
                  
                  {/* Tabs */}
                  <div className="mb-6 flex space-x-2 border-b border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('link');
                        setSubmitError(null);
                        setSelectedFiles([]);
                      }}
                      className={`px-4 py-2 font-medium text-sm transition-colors ${
                        activeTab === 'link'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Link2 className="w-4 h-4" />
                        <span>Link Post</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('file');
                        setSubmitError(null);
                        setFormData(prev => ({ ...prev, link: '' }));
                      }}
                      className={`px-4 py-2 font-medium text-sm transition-colors ${
                        activeTab === 'file'
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Upload className="w-4 h-4" />
                        <span>File Post</span>
                      </div>
                    </button>
                  </div>
                  
                  {submitError && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <p className="text-sm text-red-700">{submitError}</p>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                        <Tag className="w-4 h-4 text-blue-600" />
                        <span>Title</span>
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Enter note title"
                        className="w-full p-3 sm:p-4 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                        required
                      />
                    </div>

                    {activeTab === 'link' ? (
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                          <ExternalLink className="w-4 h-4 text-blue-600" />
                          <span>Resource Link</span>
                        </label>
                        <input
                          type="url"
                          name="link"
                          value={formData.link}
                          onChange={handleInputChange}
                          placeholder="https://..."
                          className="w-full p-3 sm:p-4 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
                          required
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                          <Upload className="w-4 h-4 text-blue-600" />
                          <span>Upload Files</span>
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                          <input
                            type="file"
                            id="file-upload"
                            multiple
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="file-upload"
                            className="cursor-pointer flex flex-col items-center"
                          >
                            <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">
                              Click to upload or drag and drop
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                              PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT (Max 10MB per file)
                            </span>
                          </label>
                        </div>
                        {selectedFiles.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {selectedFiles.map((file, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200"
                              >
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                  <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                  <span className="text-sm text-gray-700 truncate">
                                    {file.name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeFile(index)}
                                  className="ml-2 p-1 text-red-600 hover:bg-red-100 rounded"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Description</span>
                      </label>
                      <textarea
                        name="note"
                        value={formData.note}
                        onChange={handleInputChange}
                        placeholder="Add description or instructions for your students..."
                        className="w-full p-3 sm:p-4 border border-gray-300/50 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md resize-none"
                        rows="4"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className={`w-full py-3 sm:py-4 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 ${
                        submitting 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                      } text-white`}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                          <span>Posting...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span>Post Note</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Enhanced Posted Notes Container */}
                <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 lg:p-8">
                  <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Posted Notes</h2>
                        <p className="text-sm text-gray-600">{notes.length} resource{notes.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="relative">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-gray-800">Loading Notes</h3>
                      </div>
                    ) : error ? (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 bg-gradient-to-br from-red-100 to-pink-100 rounded-full flex items-center justify-center mb-4">
                          <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Notes</h4>
                        <p className="text-red-600">{error}</p>
                      </div>
                    ) : notes.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-blue-100 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                          <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                        </div>
                        <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">No Notes Posted Yet</h4>
                        <p className="text-gray-500 text-sm sm:text-base">Start sharing resources with your students</p>
                      </div>
                    ) : (
                      <div className="space-y-4 sm:space-y-6">
                        {notes.map((note, index) => (
                          <div 
                            key={note.notes_id} 
                            className={`group relative bg-gradient-to-r from-white to-blue-50/50 rounded-xl p-4 sm:p-6 border border-gray-200/50 hover:border-blue-300/50 transition-all duration-300 hover:shadow-lg animate-fade-in ${
                              viewingFile?.noteId === note.notes_id ? 'min-h-[600px]' : ''
                            }`}
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            {/* Front of card (note details) */}
                            <div className={`transition-opacity duration-300 ${viewingFile?.noteId === note.notes_id ? 'hidden' : 'block'}`}>
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start space-x-3">
                                    <div className="p-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex-shrink-0">
                                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base mb-2 truncate">
                                        {note.title || 'Untitled Note'}
                                      </h3>
                                      <div className="flex items-center space-x-2 text-xs sm:text-sm text-gray-500 mb-3">
                                        <div className="flex items-center space-x-1">
                                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                          <span>{formatDate(note.created_at)}</span>
                                        </div>
                                      </div>
                                      {note.note && (
                                        <div className="bg-white/60 rounded-lg p-3 mb-4">
                                          <p className="text-sm text-gray-700 leading-relaxed break-words">
                                            {note.note}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Display link or files */}
                              {note.link && (
                                <div className="mb-4">
                                  <a
                                    href={note.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                  >
                                    <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                                    <span>View Resource</span>
                                  </a>
                                </div>
                              )}
                              
                              {note.files && Array.isArray(note.files) && note.files.length > 0 && (
                                <div className="mb-4">
                                  <div className="flex flex-wrap gap-2">
                                    {note.files.map((fileUrl, idx) => {
                                      const fileName = fileUrl.split('/').pop() || `File ${idx + 1}`;
                                      const isPdf = isPdfFile(fileUrl);
                                      
                                      if (isPdf) {
                                        return (
                                          <button
                                            key={idx}
                                            onClick={() => setViewingFile({ noteId: note.notes_id, fileUrl, fileName })}
                                            className="inline-flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                          >
                                            <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                                            <span className="max-w-[150px] truncate">View File</span>
                                          </button>
                                        );
                                      } else {
                                        return (
                                          <a
                                            key={idx}
                                            href={fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download
                                            className="inline-flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                          >
                                            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                                            <span className="max-w-[150px] truncate">{fileName}</span>
                                          </a>
                                        );
                                      }
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex justify-end space-x-2 mt-4">
                                <button 
                                  onClick={() => handleDeleteNote(note.notes_id)}
                                  className="inline-flex items-center px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg"
                                >
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>

                            {/* Back of card (PDF viewer) */}
                            {viewingFile?.noteId === note.notes_id && (
                              <div className="h-full">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => setViewingFile(null)}
                                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                                    </button>
                                    <div>
                                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base truncate max-w-[200px]">
                                        {viewingFile.fileName}
                                      </h4>
                                      <p className="text-xs text-gray-500">{note.title || 'Untitled Note'}</p>
                                    </div>
                                  </div>
                                  <a
                                    href={viewingFile.fileUrl}
                                    download
                                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                    <Download className="w-3 h-3 mr-1.5" />
                                    <span>Download</span>
                                  </a>
                                </div>
                                <div className="bg-gray-100 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }} onContextMenu={(e) => e.preventDefault()}>
                                  <iframe
                                    src={`${viewingFile.fileUrl}#toolbar=0&navpanes=0&scrollbar=1`}
                                    className="w-full h-full border-0"
                                    title={viewingFile.fileName}
                                    onContextMenu={(e) => e.preventDefault()}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatchNotesPage;