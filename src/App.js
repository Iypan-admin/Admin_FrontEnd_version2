import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import ManagerPage from "./pages/ManagerPage";
import ManageUsersPage from "./pages/ManageUsersPage";
import FinanceAdminPage from "./pages/FinanceAdminPage";
import ApproveStudentsPage from "./pages/ApproveStudentsPage";
import AcademicCoordinatorPage from "./pages/AcademicCoordinatorPage";
import ManageBatchesPage from "./pages/ManageBatchesPage";
import ManageStudentsPage from "./pages/ManageStudentsPage";
import StateAdminPage from "./pages/StateAdminPage";
import ManageCentersPage from "./pages/ManageCentersPage";
import CenterAdminPage from "./pages/CenterAdminPage";
import TeacherPage from "./pages/TeacherPage";
import TeacherClassesPage from './pages/TeacherClassesPage';
import BatchDetailPage from './pages/BatchDetailPage';
import TakeClassPage from './pages/TakeClassPage';
import BatchChatsPage from './pages/BatchChatsPage';
import BatchNotesPage from './pages/BatchNotesPage';
import BatchCourseDetailsPage from './pages/BatchCourseDetailsPage';
import TeacherAttendancePage from './pages/TeacherAttendancePage';
import ManageCoursesPage from './pages/ManageCoursesPage';
import CourseFeesPage from './pages/CourseFeesPage';
import ManageStatesPage from './pages/ManageStatesPage';
import ViewTeachersPage from './pages/ViewTeachersPage';
import ViewStudentsPage from './pages/ViewStudentsPage';
import ViewBatchesPage from './pages/ViewBatchesPage';
import ReferredStudentsPage from './pages/ReferredStudentsPage';
import ViewCentersPage from './pages/ViewCentersPage';
import CenterFinancePage from './pages/CenterFinancePage';
import InvoiceRequestsPage from './pages/InvoiceRequestsPage';
import FinanceInvoiceApprovalPage from './pages/FinanceInvoiceApprovalPage';
import FinalInvoiceApprovalPage from './pages/FinalInvoiceApprovalPage';
import CardAdminPage from "./pages/CardAdminPage";
import ResourceManagerPage from "./pages/ResourceManagerPage";
import GenerateCardPage from "./pages/GenerateCardPage";
import ActivateCardPage from "./pages/ActivateCardPage";
import ApprovedCardPage from './pages/ApprovedCardPage';
import ApprovedGiveawayCardPage from './pages/ApprovedGiveawayPage';
import ViewCenterEliteCard from "./pages/ViewCenterEliteCard";
import InfluencerOnboardingPage from "./pages/InfluencerOnboardingPage";
import EliteCardPaymentsPage from "./pages/EliteCardPaymentsPage";
import ElitePassPage from "./pages/ElitePassPage";
import CentersLeadsPage from "./pages/CentersLeadsPage";
import BatchApprovalPage from "./pages/BatchApprovalPage";
import StudentsPage from "./pages/StudentsPage";
import TutorInfoPage from "./pages/TutorInfoPage";
import CenterRequestApprovalPage from "./pages/CenterRequestApprovalPage";
import StateBatchRequestsPage from "./pages/StateBatchRequestsPage";
import AcademicBatchRequestsPage from "./pages/AcademicBatchRequestsPage";
import EventManagementPage from "./pages/EventManagementPage";
import DemoManagementPage from "./pages/DemoManagementPage";
import AllLeadsPage from "./pages/AllLeadsPage";
import TeacherLeaveRequestPage from "./pages/TeacherLeaveRequestPage";
import AcademicSubTutorRequestsPage from "./pages/AcademicSubTutorRequestsPage";
import TeacherDemoClassesPage from "./pages/TeacherDemoClassesPage";
import LiveClassPage from "./pages/LiveClassPage";
import LSRWUploadPage from "./pages/LSRWUploadPage";
import LSRWFileViewPage from "./pages/LSRWFileViewPage";
import TeacherLSRWPage from "./pages/TeacherLSRWPage";
import BatchSessionPage from "./pages/BatchSessionPage";


function App() {
  const [role, setRole] = useState(() => {
    // Initialize role from token on first load
    const token = localStorage.getItem("token");
    if (token) {
      try {
        return JSON.parse(atob(token.split(".")[1])).role;
      } catch (error) {
        localStorage.removeItem("token");
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    // Function to check token validity
    const checkToken = () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          // Check token expiration
          const decodedToken = JSON.parse(atob(token.split(".")[1]));
          const currentTime = Date.now() / 1000;

          if (decodedToken.exp && decodedToken.exp < currentTime) {
            // Token has expired
            localStorage.removeItem("token");
            setRole(null);
            return;
          }

          setRole(decodedToken.role);
        } catch (error) {
          console.error("Token validation error:", error);
          localStorage.removeItem("token");
          setRole(null);
        }
      } else {
        setRole(null);
      }
    };

    // Check token immediately
    checkToken();

    // Set up interval to periodically check token
    const interval = setInterval(checkToken, 60000); // Check every minute

    // Add event listener for storage changes
    window.addEventListener('storage', checkToken);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkToken);
    };
  }, []);

  // Add authentication wrapper
  const ProtectedRoute = ({ children, allowedRole, allowedRoles }) => {
    const token = localStorage.getItem("token");

    // Check if role is in allowedRoles array or matches allowedRole
    const isAllowed = allowedRoles 
      ? allowedRoles.includes(role)
      : role === allowedRole;

    if (!token || !isAllowed) {
      return <Navigate to="/" replace />;
    }

    return children;
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage setRole={setRole} />} />
        {role === "admin" && (
          <>
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-users"
              element={
                <ProtectedRoute allowedRole="admin">
                  <ManageUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-states"
              element={
                <ProtectedRoute allowedRole="admin">
                  <ManageStatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-centers"
              element={
                <ProtectedRoute allowedRole="admin">
                  <ManageCentersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/center-request-approval"
              element={
                <ProtectedRoute allowedRole="admin">
                  <CenterRequestApprovalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/invoice-approval"
              element={
                <ProtectedRoute allowedRole="admin">
                  <FinalInvoiceApprovalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/batch-approval"
              element={
                <ProtectedRoute allowedRole="admin">
                  <BatchApprovalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRoles={["admin", "manager"]}>
                  <StudentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/event-management"
              element={
                <ProtectedRoute allowedRole="admin">
                  <EventManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/all-leads"
              element={
                <ProtectedRoute allowedRole="admin">
                  <AllLeadsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo-management"
              element={
                <ProtectedRoute allowedRole="admin">
                  <DemoManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/live-class"
              element={
                <ProtectedRoute allowedRole="admin">
                  <LiveClassPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/elite-pass"
              element={
                <ProtectedRoute allowedRole="admin">
                  <ElitePassPage />
                </ProtectedRoute>
              }
            />
          </>
        )}
        {role === "manager" && (
          <>
            <Route
              path="/manage-states"
              element={
                <ProtectedRoute allowedRole="manager">
                  <ManageStatesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-centers"
              element={
                <ProtectedRoute allowedRole="manager">
                  <ManageCentersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/center-request-approval"
              element={
                <ProtectedRoute allowedRole="manager">
                  <CenterRequestApprovalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager"
              element={
                <ProtectedRoute allowedRole="manager">
                  <ManagerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-users"
              element={
                <ProtectedRoute allowedRole="manager">
                  <ManageUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-courses"
              element={
                <ProtectedRoute allowedRole="manager">
                  <ManageCoursesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/course-fees"
              element={
                <ProtectedRoute allowedRole="manager">
                  <CourseFeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/batch-approval"
              element={
                <ProtectedRoute allowedRole="manager">
                  <BatchApprovalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students"
              element={
                <ProtectedRoute allowedRole="manager">
                  <StudentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/invoice-approval"
              element={
                <ProtectedRoute allowedRole="manager">
                  <FinalInvoiceApprovalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/live-class"
              element={
                <ProtectedRoute allowedRole="manager">
                  <LiveClassPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/all-leads"
              element={
                <ProtectedRoute allowedRole="manager">
                  <AllLeadsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo-management"
              element={
                <ProtectedRoute allowedRole="manager">
                  <DemoManagementPage />
                </ProtectedRoute>
              }
            />
          </>
        )}
        {role === "financial" && (
          <>
            <Route
              path="/finance-admin"
              element={
                <ProtectedRoute allowedRole="financial">
                  <FinanceAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finance-admin/invoice-approval"
              element={
                <ProtectedRoute allowedRole="financial">
                  <FinanceInvoiceApprovalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/approve-students"
              element={
                <ProtectedRoute allowedRole="financial">
                  <ApproveStudentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/approve-card"
              element={
                <ProtectedRoute allowedRole="financial">
                  <ApprovedCardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/approve-Giveaway"
              element={
                <ProtectedRoute allowedRole="financial">
                  <ApprovedGiveawayCardPage />
                </ProtectedRoute>
              }
            />
          </>
        )}
        {role === "academic" && (
          <>
            <Route
              path="/academic"
              element={
                <ProtectedRoute allowedRole="academic">
                  <AcademicCoordinatorPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-batches"
              element={
                <ProtectedRoute allowedRole="academic">
                  <ManageBatchesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-students"
              element={
                <ProtectedRoute allowedRole="academic">
                  <ManageStudentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-teachers"
              element={
                <ProtectedRoute allowedRole="academic">
                  <ManageUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/academic/batch-requests"
              element={
                <ProtectedRoute allowedRole="academic">
                  <AcademicBatchRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/academic/batch-sessions"
              element={
                <ProtectedRoute allowedRole="academic">
                  <BatchSessionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/academic/batch-sessions/:batchId"
              element={
                <ProtectedRoute allowedRole="academic">
                  <BatchSessionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/event-management"
              element={
                <ProtectedRoute allowedRole="academic">
                  <EventManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/all-leads"
              element={
                <ProtectedRoute allowedRole="academic">
                  <AllLeadsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/demo-management"
              element={
                <ProtectedRoute allowedRole="academic">
                  <DemoManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/academic/sub-tutor-requests"
              element={
                <ProtectedRoute allowedRole="academic">
                  <AcademicSubTutorRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/live-class"
              element={
                <ProtectedRoute allowedRole="academic">
                  <LiveClassPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lsrw-upload"
              element={
                <ProtectedRoute allowedRole="academic">
                  <LSRWUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lsrw-upload/:courseId"
              element={
                <ProtectedRoute allowedRole="academic">
                  <LSRWUploadPage />
                </ProtectedRoute>
              }
            />
          </>
        )}
        {role === "state" && (
          <>
            <Route
              path="/state-admin"
              element={
                <ProtectedRoute allowedRole="state">
                  <StateAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/state-admin/centers"
              element={
                <ProtectedRoute allowedRole="state">
                  <ViewCentersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/state-admin/center/:centerId/students"
              element={
                <ProtectedRoute allowedRole="state">
                  <ViewStudentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/state-admin/center/:centerId/teachers"
              element={
                <ProtectedRoute allowedRole="state">
                  <ViewTeachersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/state-admin/center/:centerId/batches"
              element={
                <ProtectedRoute allowedRole="state">
                  <ViewBatchesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/state-admin/center-requests"
              element={
                <ProtectedRoute allowedRole="state">
                  <CenterRequestApprovalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/state-admin/batch-requests"
              element={
                <ProtectedRoute allowedRole="state">
                  <StateBatchRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/state-admin/invoice-requests"
              element={
                <ProtectedRoute allowedRole="state">
                  <InvoiceRequestsPage />
                </ProtectedRoute>
              }
            />
          </>
        )}
        {role === "center" && (
          <>
            <Route
              path="/center-admin"
              element={
                <ProtectedRoute allowedRole="center">
                  <CenterAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/center-admin/teachers"
              element={
                <ProtectedRoute allowedRole="center">
                  <ViewTeachersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/center-admin/students"
              element={
                <ProtectedRoute allowedRole="center">
                  <ViewStudentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/center-admin/referred-students"
              element={
                <ProtectedRoute allowedRole="center">
                  <ReferredStudentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/center-admin/batches"
              element={
                <ProtectedRoute allowedRole="center">
                  <ViewBatchesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/center/viewcenterelite"
              element={
                <ProtectedRoute allowedRole="center">
                  <ViewCenterEliteCard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/center/leads"
              element={
                <ProtectedRoute allowedRole="center">
                  <CentersLeadsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/center-admin/finance"
              element={
                <ProtectedRoute allowedRole="center">
                  <CenterFinancePage />
                </ProtectedRoute>
              }
            />
          </>
        )}
        {role === "teacher" && (
          <>
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <TeacherPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/classes"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <TeacherClassesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/demo-classes"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <TeacherDemoClassesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/batch/:batchId"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <BatchDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/batch/:batchId/take-class"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <TakeClassPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/batch/:batchId/attendance"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <TeacherAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/batch/:batchId/lsrw"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <TeacherLSRWPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/batch/:batchId/chats"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <BatchChatsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/batch/:batchId/notes"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <BatchNotesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/batch/:batchId/details"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <BatchCourseDetailsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/tutor-info"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <TutorInfoPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/leave-requests"
              element={
                <ProtectedRoute allowedRole="teacher">
                  <TeacherLeaveRequestPage />
                </ProtectedRoute>
              }
            />
          </>
        )}
        {role === "cardadmin" && (
          <>
            <Route
              path="/cardadmin"
              element={
                <ProtectedRoute allowedRole="cardadmin">
                  <CardAdminPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/generate-card"
              element={
                <ProtectedRoute allowedRole="cardadmin">
                  <GenerateCardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/activate-card"
              element={
                <ProtectedRoute allowedRole="cardadmin">
                  <ActivateCardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/influencer-onboarding"
              element={
                <ProtectedRoute allowedRole="cardadmin">
                  <InfluencerOnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/elite-card-payments"
              element={
                <ProtectedRoute allowedRole="cardadmin">
                  <EliteCardPaymentsPage />
                </ProtectedRoute>
              }
            />
          </>
        )}
        {role === "resource_manager" && (
          <>
            <Route
              path="/resource-manager"
              element={
                <ProtectedRoute allowedRole="resource_manager">
                  <ResourceManagerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lsrw-upload/listening"
              element={
                <ProtectedRoute allowedRole="resource_manager">
                  <LSRWUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lsrw-upload/speaking"
              element={
                <ProtectedRoute allowedRole="resource_manager">
                  <LSRWUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lsrw-upload/reading"
              element={
                <ProtectedRoute allowedRole="resource_manager">
                  <LSRWUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lsrw-upload/writing"
              element={
                <ProtectedRoute allowedRole="resource_manager">
                  <LSRWUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lsrw-upload/:module/:courseId"
              element={
                <ProtectedRoute allowedRole="resource_manager">
                  <LSRWUploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lsrw-file-view"
              element={
                <ProtectedRoute allowedRole="resource_manager">
                  <LSRWFileViewPage />
                </ProtectedRoute>
              }
            />
          </>
        )}

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
