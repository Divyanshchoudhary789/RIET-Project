import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

// ── Auth pages ──
const Login = lazy(() => import('./pages/Login'));
const ChangePassword = lazy(() => import('./components/ChangePassword'));

// ── Center Head ──
const CenterHeadDashboard = lazy(() => import('./pages/centerHead/CenterHeadDashboard'));
const CenterHeadRequirements = lazy(() => import('./pages/centerHead/RequirementsList'));
const NewRequirement = lazy(() => import('./pages/centerHead/NewRequirement'));
const ResubmitRequirement = lazy(() => import('./pages/centerHead/ResubmitRequirement'));

// ── Cluster Manager ──
const ClusterDashboard = lazy(() => import('./pages/clusterManager/ClusterDashboard'));
const ClusterRequirements = lazy(() => import('./pages/clusterManager/RequirementsList'));
const WorkProposalsList = lazy(() => import('./pages/clusterManager/WorkProposalsList'));
const NewWorkProposal = lazy(() => import('./pages/clusterManager/NewWorkProposal'));
const ResubmitWorkProposal = lazy(() => import('./pages/clusterManager/ResubmitWorkProposal'));

// ── Department Admin ──
const DeptAdminDashboard = lazy(() => import('./pages/departmentAdmin/DeptAdminDashboard'));
const DeptWorkProposals = lazy(() => import('./pages/departmentAdmin/WorkProposalsList'));
const DeptAssessments = lazy(() => import('./pages/departmentAdmin/AssessmentsList'));
const NewAssessment = lazy(() => import('./pages/departmentAdmin/NewAssessment'));
const ResubmitAssessment = lazy(() => import('./pages/departmentAdmin/ResubmitAssessment'));

// ── Director ──
const DirectorDashboard = lazy(() => import('./pages/director/DirectorDashboard'));
const DirectorAssessments = lazy(() => import('./pages/director/AssessmentsList'));
const DirectorNotesheets = lazy(() => import('./pages/director/NotesheetsList'));
const DirectorMemos = lazy(() => import('./pages/director/MemosList'));
const NewMemo = lazy(() => import('./pages/director/NewMemo'));
const CampusesList = lazy(() => import('./pages/director/CampusesList'));
const DepartmentsList = lazy(() => import('./pages/director/DepartmentsList'));
const DirectorUsers = lazy(() => import('./pages/director/UsersList'));

// ── PO Office ──
const PODashboard = lazy(() => import('./pages/poOffice/PODashboard'));
const POAssessments = lazy(() => import('./pages/poOffice/AssessmentsList'));
const PONotesheets = lazy(() => import('./pages/poOffice/NotesheetsList'));
const NewNotesheet = lazy(() => import('./pages/poOffice/NewNotesheet'));
const ResubmitNotesheet = lazy(() => import('./pages/poOffice/ResubmitNotesheet'));

// ── Chairperson ──
const ChairpersonDashboard = lazy(() => import('./pages/chairperson/ChairpersonDashboard'));
const ChairMemos = lazy(() => import('./pages/chairperson/MemosList'));
const ChairUsers = lazy(() => import('./pages/chairperson/UsersList'));

// ── Accounts ──
const AccountsDashboard = lazy(() => import('./pages/accounts/AccountsDashboard'));
const AccountsMemos = lazy(() => import('./pages/accounts/MemosList'));
const PurchaseOrdersList = lazy(() => import('./pages/accounts/PurchaseOrdersList'));
const PurchaseOrderDetail = lazy(() => import('./pages/accounts/PurchaseOrderDetail'));

// ── Shared ──
const StockPage = lazy(() => import('./pages/StockPage'));

const Loader = () => (
  <div className="page-loader"><span className="spinner" /></div>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Suspense fallback={<Loader />}>
        <Routes>
          {/* Root */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />

          {/* ── Center Head ── */}
          <Route
            path="/center-head"
            element={
              <ProtectedRoute allowedRoles={['center_head']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<CenterHeadDashboard />} />
            <Route path="requirements" element={<CenterHeadRequirements />} />
            <Route path="new-requirement" element={<NewRequirement />} />
            <Route path="requirements/:id/resubmit" element={<ResubmitRequirement />} />
            <Route path="stock" element={<StockPage />} />
          </Route>

          {/* ── Cluster Manager ── */}
          <Route
            path="/cluster-manager"
            element={
              <ProtectedRoute allowedRoles={['cluster_manager']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ClusterDashboard />} />
            <Route path="requirements" element={<ClusterRequirements />} />
            <Route path="proposals" element={<WorkProposalsList />} />
            <Route path="proposals/new" element={<NewWorkProposal />} />
            <Route path="proposals/:id/resubmit" element={<ResubmitWorkProposal />} />
            <Route path="stock" element={<StockPage />} />
          </Route>

          {/* ── Department Admin ── */}
          <Route
            path="/department-admin"
            element={
              <ProtectedRoute allowedRoles={['department_admin']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DeptAdminDashboard />} />
            <Route path="proposals" element={<DeptWorkProposals />} />
            <Route path="assessments" element={<DeptAssessments />} />
            <Route path="assessments/new" element={<NewAssessment />} />
            <Route path="assessments/:id/resubmit" element={<ResubmitAssessment />} />
            <Route path="stock" element={<StockPage />} />
          </Route>

          {/* ── Director ── */}
          <Route
            path="/director"
            element={
              <ProtectedRoute allowedRoles={['director']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DirectorDashboard />} />
            <Route path="assessments" element={<DirectorAssessments />} />
            <Route path="notesheets" element={<DirectorNotesheets />} />
            <Route path="memos" element={<DirectorMemos />} />
            <Route path="memos/new" element={<NewMemo />} />
            <Route path="campuses" element={<CampusesList />} />
            <Route path="departments" element={<DepartmentsList />} />
            <Route path="users" element={<DirectorUsers />} />
            <Route path="stock" element={<StockPage />} />
          </Route>

          {/* ── PO Office ── */}
          <Route
            path="/po-office"
            element={
              <ProtectedRoute allowedRoles={['po_office']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PODashboard />} />
            <Route path="assessments" element={<POAssessments />} />
            <Route path="notesheets" element={<PONotesheets />} />
            <Route path="notesheets/new" element={<NewNotesheet />} />
            <Route path="notesheets/:id/resubmit" element={<ResubmitNotesheet />} />
          </Route>

          {/* ── Chairperson ── */}
          <Route
            path="/chairperson"
            element={
              <ProtectedRoute allowedRoles={['chairperson']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ChairpersonDashboard />} />
            <Route path="memos" element={<ChairMemos />} />
            <Route path="users" element={<ChairUsers />} />
            <Route path="stock" element={<StockPage />} />
          </Route>

          {/* ── Accounts ── */}
          <Route
            path="/accounts"
            element={
              <ProtectedRoute allowedRoles={['accounts']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AccountsDashboard />} />
            <Route path="memos" element={<AccountsMemos />} />
            <Route path="purchase-orders" element={<PurchaseOrdersList />} />
            <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
