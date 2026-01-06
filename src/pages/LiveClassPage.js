import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { getTodayLiveClasses, getAllClasses, getBatchById } from '../services/Api';
import { Video, ExternalLink, Clock, Users, BookOpen, X, GraduationCap, Search, Filter, Calendar, History, Download } from 'lucide-react';

function LiveClassPage() {
  const [liveClasses, setLiveClasses] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('today'); // 'today' or 'history'
  
  // Filter states
  const [searchBatchName, setSearchBatchName] = useState('');
  const [searchTeacherName, setSearchTeacherName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  // Batch details modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [batchStudents, setBatchStudents] = useState([]);
  const [loadingBatchDetails, setLoadingBatchDetails] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const cleanMeetUrl = (url) => {
    try {
      let cleanUrl = url.trim();
      
      // Remove mobile app intent URLs
      if (cleanUrl.includes('intent://')) {
        const urlMatch = cleanUrl.match(/url%3D([^&]+)/);
        if (urlMatch) {
          cleanUrl = decodeURIComponent(urlMatch[1]);
        }
      }
      
      // Extract meeting code and create clean URL
      const patterns = [
        /https:\/\/meet\.google\.com\/([a-z0-9-]+)/i,
        /https:\/\/meet\.google\.com\/[a-z0-9-]+\?.*/i,
        /https:\/\/meet\.google\.com\/[a-z0-9-]+\/.*/i
      ];

      for (const pattern of patterns) {
        const match = cleanUrl.match(pattern);
        if (match && match[1]) {
          return `https://meet.google.com/${match[1]}`;
        }
      }
      
      return cleanUrl;
    } catch (err) {
      console.error('Error cleaning Meet URL:', err);
      return url;
    }
  };

  const handleBatchClick = async (batchId, batchName) => {
    try {
      setModalOpen(true);
      setLoadingBatchDetails(true);
      setLoadingStudents(true);
      setSelectedBatch(null);
      setBatchStudents([]);

      const token = localStorage.getItem('token');
      
      // Fetch batch details and students in parallel
      const [batchResponse, studentsResponse] = await Promise.all([
        getBatchById(token, batchId).catch(err => {
          console.error('Error fetching batch details:', err);
          return null;
        }),
        fetch(`http://localhost:3008/api/students/batch/${batchId}`, {
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(res => res.ok ? res.json() : { data: [] }).catch(err => {
          console.error('Error fetching students:', err);
          return { data: [] };
        })
      ]);

      // Set batch details
      // Handle both response formats: { success: true, data: {...} } or direct data
      if (batchResponse) {
        const batchData = (batchResponse.success && batchResponse.data) ? batchResponse.data : batchResponse;
        setSelectedBatch(batchData);
      } else {
        // If batch details fail, create minimal batch info from the live class data
        const currentClasses = activeTab === 'today' ? liveClasses : allClasses;
        const classItem = currentClasses.find(item => item.batch_id === batchId);
        if (classItem) {
          setSelectedBatch({
            batch_id: batchId,
            batch_name: batchName,
            course_name: classItem.course_name,
            teacher_name: classItem.tutor_name,
            time_from: classItem.time_from,
            time_to: classItem.time_to
          });
        }
      }

      // Set students
      if (studentsResponse && studentsResponse.data) {
        setBatchStudents(studentsResponse.data);
      }
    } catch (error) {
      console.error('Error loading batch details:', error);
    } finally {
      setLoadingBatchDetails(false);
      setLoadingStudents(false);
    }
  };

  const formatPhone = (phone) => {
    return phone ? phone.toString().replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3") : "N/A";
  };

  // CSV Download Function
  const downloadCSV = (classes, filename) => {
    if (!classes || classes.length === 0) {
      alert('No data to export');
      return;
    }

    // CSV Headers
    const headers = [
      'S.No',
      'Batch ID',
      'Batch Name',
      'Course Name',
      'Tutor Name',
      'Date',
      'Time',
      'Title',
      'Class Link',
      'Note'
    ];

    // Convert classes to CSV rows
    const csvRows = [
      headers.join(','),
      ...classes.map((classItem, index) => {
        return [
          index + 1,
          `"${classItem.batch_id || ''}"`,
          `"${(classItem.batch_name || '').replace(/"/g, '""')}"`,
          `"${(classItem.course_name || '').replace(/"/g, '""')}"`,
          `"${(classItem.tutor_name || '').replace(/"/g, '""')}"`,
          `"${formatDate(classItem.date)}"`,
          `"${formatTime(classItem.class_time)}"`,
          `"${(classItem.title || '').replace(/"/g, '""')}"`,
          `"${classItem.class_link || ''}"`,
          `"${(classItem.note || '').replace(/"/g, '""')}"`
        ].join(',');
      })
    ];

    // Create CSV content
    const csvContent = csvRows.join('\n');
    
    // Create blob and download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get available months and years from history classes
  const getAvailableMonthsAndYears = () => {
    const today = new Date().toISOString().split('T')[0];
    const historyClasses = allClasses.filter(c => c.date < today);
    
    const monthYearMap = new Map();
    historyClasses.forEach(classItem => {
      if (classItem.date) {
        const date = new Date(classItem.date);
        const month = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear().toString();
        const key = `${month}_${year}`;
        monthYearMap.set(key, { month, year });
      }
    });

    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    
    const years = Array.from(new Set(Array.from(monthYearMap.values()).map(m => m.year))).sort((a, b) => b - a);
    
    return { months, years, monthYearMap: Array.from(monthYearMap.values()) };
  };

  // Filter classes by month and year
  const filterClassesByMonth = (classes, month, year) => {
    if (!month || !year) return classes;
    
    return classes.filter(classItem => {
      if (!classItem.date) return false;
      const date = new Date(classItem.date);
      const classMonth = date.toLocaleString('default', { month: 'long' });
      const classYear = date.getFullYear().toString();
      return classMonth === month && classYear === year;
    });
  };

  // Download handlers
  const handleDownloadAllHistory = () => {
    const today = new Date().toISOString().split('T')[0];
    const historyClasses = allClasses.filter(c => c.date < today);
    downloadCSV(historyClasses, `all_class_history_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDownloadByBatchName = () => {
    if (!searchBatchName.trim()) {
      alert('Please enter a batch name to filter');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    let filtered = allClasses.filter(c => c.date < today);
    filtered = filtered.filter(c => 
      c.batch_name && c.batch_name.toLowerCase().includes(searchBatchName.toLowerCase())
    );
    
    if (filtered.length === 0) {
      alert('No classes found for this batch name');
      return;
    }
    
    downloadCSV(filtered, `class_history_batch_${searchBatchName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDownloadByTeacherName = () => {
    if (!searchTeacherName.trim()) {
      alert('Please enter a teacher name to filter');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    let filtered = allClasses.filter(c => c.date < today);
    filtered = filtered.filter(c => 
      c.tutor_name && c.tutor_name.toLowerCase().includes(searchTeacherName.toLowerCase())
    );
    
    if (filtered.length === 0) {
      alert('No classes found for this teacher name');
      return;
    }
    
    downloadCSV(filtered, `class_history_teacher_${searchTeacherName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDownloadByBatchNameAndMonth = () => {
    if (!searchBatchName.trim()) {
      alert('Please enter a batch name to filter');
      return;
    }
    if (!selectedMonth || !selectedYear) {
      alert('Please select a month and year to filter');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    let filtered = allClasses.filter(c => c.date < today);
    filtered = filtered.filter(c => 
      c.batch_name && c.batch_name.toLowerCase().includes(searchBatchName.toLowerCase())
    );
    filtered = filterClassesByMonth(filtered, selectedMonth, selectedYear);
    
    if (filtered.length === 0) {
      alert('No classes found for this batch name and month');
      return;
    }
    
    downloadCSV(filtered, `class_history_batch_${searchBatchName.replace(/[^a-z0-9]/gi, '_')}_${selectedMonth}_${selectedYear}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDownloadByTeacherNameAndMonth = () => {
    if (!searchTeacherName.trim()) {
      alert('Please enter a teacher name to filter');
      return;
    }
    if (!selectedMonth || !selectedYear) {
      alert('Please select a month and year to filter');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    let filtered = allClasses.filter(c => c.date < today);
    filtered = filtered.filter(c => 
      c.tutor_name && c.tutor_name.toLowerCase().includes(searchTeacherName.toLowerCase())
    );
    filtered = filterClassesByMonth(filtered, selectedMonth, selectedYear);
    
    if (filtered.length === 0) {
      alert('No classes found for this teacher name and month');
      return;
    }
    
    downloadCSV(filtered, `class_history_teacher_${searchTeacherName.replace(/[^a-z0-9]/gi, '_')}_${selectedMonth}_${selectedYear}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Fetch both today's classes and all classes
        const [todayData, allData] = await Promise.all([
          getTodayLiveClasses(token).catch(err => {
            console.error('Error fetching today\'s classes:', err);
            return [];
          }),
          getAllClasses(token).catch(err => {
            console.error('Error fetching all classes:', err);
            return [];
          })
        ]);
        
        setLiveClasses(todayData || []);
        setAllClasses(allData || []);
        setError(null);
      } catch (err) {
        console.error('Error fetching classes:', err);
        setError(err.message || 'Failed to load classes');
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
    
    // Refresh every 5 minutes (only for today's classes)
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token');
        const todayData = await getTodayLiveClasses(token);
        setLiveClasses(todayData || []);
      } catch (err) {
        console.error('Error refreshing live classes:', err);
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex">
      <Navbar />
      
      {/* Main Content Area */}
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 min-h-full">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto">
              {/* Enhanced Header */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                      <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Live Classes
                      </h1>
                      <p className="text-sm sm:text-base text-gray-600 mt-1">
                        {activeTab === 'today' 
                          ? "Monitor today's active classes across all batches"
                          : "View all classes history across all batches"}
                      </p>
                    </div>
                  </div>
                  
                  {!loading && activeTab === 'today' && liveClasses.length > 0 && (
                    <div className="flex items-center space-x-2 bg-green-100 px-3 py-1.5 rounded-full">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-green-700 text-sm font-semibold">
                        {liveClasses.length} Live Class{liveClasses.length > 1 ? 'es' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="mb-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-1">
                  <nav className="flex space-x-1" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab('today')}
                      className={`${
                        activeTab === 'today'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      } flex-1 py-2.5 px-3 rounded-lg font-medium text-sm flex items-center justify-center transition-all duration-200`}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Today's Classes
                      {!loading && liveClasses.length > 0 && (
                        <span className="ml-2 bg-white/20 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                          {liveClasses.length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('history')}
                      className={`${
                        activeTab === 'history'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      } flex-1 py-2.5 px-3 rounded-lg font-medium text-sm flex items-center justify-center transition-all duration-200`}
                    >
                      <History className="h-4 w-4 mr-2" />
                      History
                      {!loading && allClasses.length > 0 && (
                        <span className="ml-2 bg-white/20 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                          {allClasses.length}
                        </span>
                      )}
                    </button>
                  </nav>
                </div>
              </div>

              {/* Advanced Filter and Search */}
              <div className="mb-6 bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-6">
                <div className="flex items-center mb-4">
                  <Filter className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Advanced Filter & Search</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Batch Name Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search by Batch Name
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Enter batch name..."
                        value={searchBatchName}
                        onChange={(e) => setSearchBatchName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  {/* Teacher Name Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search by Teacher Name
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Enter teacher name..."
                        value={searchTeacherName}
                        onChange={(e) => setSearchTeacherName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Clear Filters Button */}
                {(searchBatchName || searchTeacherName || selectedMonth) && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setSearchBatchName('');
                        setSearchTeacherName('');
                        setSelectedMonth('');
                        setSelectedYear(new Date().getFullYear().toString());
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>

              {/* CSV Download Section - Only show in History tab */}
              {activeTab === 'history' && (
                <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-lg border border-green-100 p-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <Download className="w-5 h-5 text-green-600 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">CSV Download Options</h3>
                  </div>
                  
                  {/* Month and Year Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Month
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">All Months</option>
                        <option value="January">January</option>
                        <option value="February">February</option>
                        <option value="March">March</option>
                        <option value="April">April</option>
                        <option value="May">May</option>
                        <option value="June">June</option>
                        <option value="July">July</option>
                        <option value="August">August</option>
                        <option value="September">September</option>
                        <option value="October">October</option>
                        <option value="November">November</option>
                        <option value="December">December</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Year
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        {(() => {
                          const currentYear = new Date().getFullYear();
                          const years = [];
                          for (let year = currentYear; year >= currentYear - 5; year--) {
                            years.push(year);
                          }
                          return years.map(year => (
                            <option key={year} value={year.toString()}>{year}</option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>

                  {/* Download Buttons Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Download All History */}
                    <button
                      onClick={handleDownloadAllHistory}
                      className="flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download All History
                    </button>

                    {/* Download by Batch Name */}
                    <button
                      onClick={handleDownloadByBatchName}
                      disabled={!searchBatchName.trim()}
                      className={`flex items-center justify-center px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg ${
                        searchBatchName.trim()
                          ? 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download by Batch Name
                    </button>

                    {/* Download by Teacher Name */}
                    <button
                      onClick={handleDownloadByTeacherName}
                      disabled={!searchTeacherName.trim()}
                      className={`flex items-center justify-center px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg ${
                        searchTeacherName.trim()
                          ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download by Teacher Name
                    </button>

                    {/* Download by Batch Name + Month */}
                    <button
                      onClick={handleDownloadByBatchNameAndMonth}
                      disabled={!searchBatchName.trim() || !selectedMonth}
                      className={`flex items-center justify-center px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg ${
                        searchBatchName.trim() && selectedMonth
                          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download by Batch + Month
                    </button>

                    {/* Download by Teacher Name + Month */}
                    <button
                      onClick={handleDownloadByTeacherNameAndMonth}
                      disabled={!searchTeacherName.trim() || !selectedMonth}
                      className={`flex items-center justify-center px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg ${
                        searchTeacherName.trim() && selectedMonth
                          ? 'bg-gradient-to-r from-pink-600 to-pink-700 text-white hover:from-pink-700 hover:to-pink-800'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download by Teacher + Month
                    </button>

                    {/* Download Current Filtered Results */}
                    {(() => {
                      const today = new Date().toISOString().split('T')[0];
                      let filtered = allClasses.filter(c => c.date < today);
                      
                      if (searchBatchName) {
                        filtered = filtered.filter(c => 
                          c.batch_name && c.batch_name.toLowerCase().includes(searchBatchName.toLowerCase())
                        );
                      }
                      
                      if (searchTeacherName) {
                        filtered = filtered.filter(c => 
                          c.tutor_name && c.tutor_name.toLowerCase().includes(searchTeacherName.toLowerCase())
                        );
                      }
                      
                      if (selectedMonth && selectedYear) {
                        filtered = filterClassesByMonth(filtered, selectedMonth, selectedYear);
                      }
                      
                      return (
                        <button
                          onClick={() => {
                            if (filtered.length === 0) {
                              alert('No classes match the current filters');
                              return;
                            }
                            downloadCSV(filtered, `class_history_filtered_${new Date().toISOString().split('T')[0]}.csv`);
                          }}
                          disabled={filtered.length === 0}
                          className={`flex items-center justify-center px-4 py-2.5 rounded-lg transition-all duration-200 font-medium text-sm shadow-md hover:shadow-lg ${
                            filtered.length > 0
                              ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white hover:from-teal-700 hover:to-teal-800'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Filtered ({filtered.length})
                        </button>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Filter Classes */}
              {(() => {
                const today = new Date().toISOString().split('T')[0];
                
                // Get classes based on active tab
                // For today tab, use liveClasses directly (already filtered for today)
                // For history tab, filter allClasses for past dates
                let classesToFilter = activeTab === 'today' 
                  ? liveClasses 
                  : allClasses.filter(c => c.date < today);
                
                // Apply search filters
                let filteredClasses = classesToFilter.filter(classItem => {
                  const batchMatch = !searchBatchName || 
                    (classItem.batch_name && classItem.batch_name.toLowerCase().includes(searchBatchName.toLowerCase()));
                  const teacherMatch = !searchTeacherName || 
                    (classItem.tutor_name && classItem.tutor_name.toLowerCase().includes(searchTeacherName.toLowerCase()));
                  
                  return batchMatch && teacherMatch;
                });

                // Apply month filter for history tab
                if (activeTab === 'history' && selectedMonth && selectedYear) {
                  filteredClasses = filterClassesByMonth(filteredClasses, selectedMonth, selectedYear);
                }

                return (
                  <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-blue-100 text-sm font-semibold mb-1">
                              {activeTab === 'today' ? 'Total Live Classes' : 'Total Classes'}
                            </p>
                            <p className="text-white text-3xl font-bold">{filteredClasses.length}</p>
                          </div>
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                            <Video className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-100 text-sm font-semibold mb-1">Unique Batches</p>
                            <p className="text-white text-3xl font-bold">
                              {new Set(filteredClasses.map(c => c.batch_id)).size}
                            </p>
                          </div>
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                            <Users className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-xl p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-purple-100 text-sm font-semibold mb-1">
                              {activeTab === 'today' ? 'Active Tutors' : 'Total Tutors'}
                            </p>
                            <p className="text-white text-3xl font-bold">
                              {new Set(filteredClasses.map(c => c.tutor_name).filter(Boolean)).size}
                            </p>
                          </div>
                          <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                            <BookOpen className="w-8 h-8 text-white" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          <span className="font-medium">{error}</span>
                        </div>
                      </div>
                    )}

                    {/* Loading State */}
                    {loading ? (
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 font-medium">Loading classes...</p>
                      </div>
                    ) : filteredClasses.length === 0 ? (
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-12 text-center">
                        <div className="mx-auto w-24 h-24 bg-gradient-to-r from-gray-100 to-blue-100 rounded-full flex items-center justify-center mb-6">
                          <Video className="w-12 h-12 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {activeTab === 'today' ? 'No Live Classes Today' : 'No Classes Found'}
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                          {activeTab === 'today' 
                            ? "There are no scheduled classes for today. Check back later or view the schedule."
                            : (searchBatchName || searchTeacherName)
                            ? "No classes match your search filters. Try adjusting your search criteria."
                            : "There are no classes in history yet."}
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-4 border-b border-gray-200">
                          <h2 className="text-xl font-bold text-white">
                            {activeTab === 'today' ? "Today's Live Classes" : "Class History"}
                          </h2>
                          <p className="text-blue-100 text-sm">
                            {filteredClasses.length} class{filteredClasses.length > 1 ? 'es' : ''} found
                            {(searchBatchName || searchTeacherName) && ' (filtered)'}
                          </p>
                        </div>
                        <div className="overflow-x-auto">
                          <div className="max-h-[600px] overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">S.No</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch ID</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch Name</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Course Name</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tutor Name</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                                  <th className="px-4 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Class Link</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-100">
                                {filteredClasses.map((classItem, index) => (
                                  <tr key={classItem.meet_id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{index + 1}</td>
                                    <td className="px-4 py-4 text-sm font-mono text-blue-600">{classItem.batch_id?.substring(0, 8)}...</td>
                                    <td className="px-4 py-4 text-sm">
                                      <button
                                        onClick={() => handleBatchClick(classItem.batch_id, classItem.batch_name)}
                                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200 text-left"
                                      >
                                        {classItem.batch_name || 'N/A'}
                                      </button>
                                    </td>
                                    <td className="px-4 py-4 text-sm text-gray-600">{classItem.course_name || 'N/A'}</td>
                                    <td className="px-4 py-4 text-sm text-gray-600">{classItem.tutor_name || 'N/A'}</td>
                                    <td className="px-4 py-4 text-sm text-gray-600">{formatDate(classItem.date)}</td>
                                    <td className="px-4 py-4 text-sm font-medium text-purple-600">
                                      <div className="flex items-center space-x-1">
                                        <Clock className="w-4 h-4" />
                                        <span>{formatTime(classItem.class_time)}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 text-sm">
                                      {classItem.class_link ? (
                                        <a
                                          href={cleanMeetUrl(classItem.class_link)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 text-xs font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                                        >
                                          <ExternalLink className="w-4 h-4 mr-2" />
                                          {activeTab === 'today' ? 'Join Class' : 'View Link'}
                                        </a>
                                      ) : (
                                        <span className="text-gray-400 text-xs">No link available</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Batch Details Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Batch Details</h2>
                  {selectedBatch?.batch_name && (
                    <p className="text-blue-100 text-sm">{selectedBatch.batch_name}</p>
                  )}
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Batch Information Cards */}
              {loadingBatchDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : selectedBatch && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Batch Name */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-600 p-2 rounded-lg">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase">Batch Name</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedBatch.batch_name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Course Name */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-600 p-2 rounded-lg">
                        <GraduationCap className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 uppercase">Course</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedBatch.course_name || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Students List */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  Enrolled Students ({batchStudents.length})
                </h3>
                
                {loadingStudents ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : batchStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No students enrolled yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {batchStudents.map((student, index) => (
                      <div
                        key={student.student_id || index}
                        className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                              {student.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">{student.name || 'N/A'}</h3>
                              <p className="text-sm text-gray-600">{student.email || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{formatPhone(student.phone)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500 mb-1">Registration</div>
                            <div className="font-mono text-sm font-semibold text-blue-600">{student.registration_number || 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveClassPage;

