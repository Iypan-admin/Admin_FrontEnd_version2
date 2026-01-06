import React from 'react';
import Navbar from '../components/Navbar';
import EventCalendar from '../components/EventCalendar';

const EventManagementPage = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      <div className="flex-1 lg:ml-64 h-screen overflow-y-auto">
        <div className="p-4 lg:p-8">
          <div className="mt-16 lg:mt-0">
            <div className="max-w-7xl mx-auto">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-xl p-6 sm:p-8 mb-8 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 sm:p-4 bg-white/20 rounded-xl backdrop-blur-sm">
                        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
                          Event Management
                        </h1>
                        <p className="text-blue-100 text-sm sm:text-base lg:text-lg">
                          Create, edit, and manage academic events and schedules
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Calendar Component */}
              <EventCalendar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventManagementPage;



