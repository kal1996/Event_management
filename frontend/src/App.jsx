
import React from 'react';
import Register from './components/Register';
import Login from './components/Login';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';
import Home from './components/Home';
import UserDashboard from './components/UserDashboard';
import Booking from './components/Booking';
import PaymentVerify from './components/PaymentVerify';
import ChapaCheckoutSimulator from './components/ChapaCheckoutSimulator';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  const ProtectedAdminRoute = ({ children }) => {
    const role = localStorage.getItem("role");
    if (role !== "admin") {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  const ProtectedUserRoute = ({ children }) => {
    const username = localStorage.getItem("username");
    if (!username) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return ( 
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/book/:eventId" element={<Booking />} />
          <Route path="/payment-verify" element={<PaymentVerify />} />
          <Route path="/chapa-checkout/:txRef" element={<ChapaCheckoutSimulator />} />
          <Route path="/user" element={
            <ProtectedUserRoute>
              <UserDashboard />
            </ProtectedUserRoute>
          } />
          <Route path="/admin" element={
            <ProtectedAdminRoute>
              <AdminDashboard />
            </ProtectedAdminRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
