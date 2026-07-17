import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { verifyOtp, resendOtp } from "../services/Api";
import Logo from "../assets/Logo.png";

const OtpVerifyPage = ({ setRole }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // name + password passed from LoginPage via navigate state
  const { name, password, emailHint } = location.state || {};

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState(null);
  const [lockedUntil, setLockedUntil] = useState(null);

  const inputRefs = useRef([]);

  // If user navigated directly without state, redirect to login
  useEffect(() => {
    if (!name) {
      navigate("/", { replace: true });
    }
  }, [name, navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Lockout countdown display
  const getLockoutRemaining = () => {
    if (!lockedUntil) return null;
    const diff = Math.ceil((new Date(lockedUntil) - new Date()) / 60000);
    return diff > 0 ? diff : null;
  };

  // Handle OTP digit input
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // only digits
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // only 1 digit per box
    setOtp(newOtp);
    setError("");

    // Auto-focus next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    pasted.split("").forEach((ch, i) => {
      if (i < 6) newOtp[i] = ch;
    });
    setOtp(newOtp);
    // Focus last filled box
    const lastIndex = Math.min(pasted.length, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    const otpValue = otp.join("");
    if (otpValue.length < 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await verifyOtp(name, otpValue);

      // Store token and set role
      localStorage.setItem("token", data.token);
      const decoded = JSON.parse(atob(data.token.split(".")[1]));
      setRole(decoded.role);
      navigate("/admin", { replace: true });
    } catch (err) {
      const msg = err.message || "OTP verification failed.";
      setError(msg);

      // Parse remaining attempts from error message
      const attemptsMatch = msg.match(/(\d+) attempt/);
      if (attemptsMatch) setRemainingAttempts(parseInt(attemptsMatch[1]));

      // Parse lockout
      const lockoutMatch = msg.match(/locked/i);
      if (lockoutMatch) setOtp(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !password) return;
    try {
      setResending(true);
      setError("");
      setSuccessMsg("");
      const data = await resendOtp(name, password);
      setSuccessMsg("✅ New OTP sent to your email!");
      setOtp(["", "", "", "", "", ""]);
      setRemainingAttempts(null);
      setCooldown(30);
      setTimeout(() => setSuccessMsg(""), 4000);
      inputRefs.current[0]?.focus();
    } catch (err) {
      const msg = err.message || "Failed to resend OTP.";
      // Parse wait seconds from cooldown error
      const waitMatch = msg.match(/wait (\d+) seconds/i);
      if (waitMatch) {
        setCooldown(parseInt(waitMatch[1]));
      }
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Left Panel */}
      <div
        className="hidden md:flex md:w-2/5 flex-col items-center justify-center p-12 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        <div className="relative z-10 text-center">
          <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-8 border border-white/20 backdrop-blur-sm">
            <img src={Logo} alt="ISML Logo" className="w-16 h-16 object-contain" />
          </div>
          <h2 className="text-3xl font-black mb-3">Secure Login</h2>
          <p className="text-blue-200 text-base mb-8">Two-Factor Authentication</p>

          {/* Security steps */}
          <div className="space-y-4 text-left">
            {[
              { icon: "✅", label: "Credentials Verified", done: true },
              { icon: "📧", label: "OTP Sent to Email", done: true },
              { icon: "🔐", label: "Enter OTP to Proceed", done: false },
            ].map((step, i) => (
              <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${step.done ? "bg-white/15 border-white/20" : "bg-blue-500/20 border-blue-400/30"}`}>
                <span className="text-xl">{step.icon}</span>
                <span className={`text-sm font-medium ${step.done ? "text-white" : "text-blue-200"}`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full md:w-3/5 bg-gray-50 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="md:hidden flex justify-center mb-8">
            <div className="w-20 h-20 bg-white rounded-2xl shadow-lg border border-gray-200 flex items-center justify-center">
              <img src={Logo} alt="ISML" className="w-14 h-14 object-contain" />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "linear-gradient(135deg, #1a1a2e, #0f3460)" }}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Verify OTP</h1>
              <p className="text-gray-500 text-sm mt-2">
                Enter the 6-digit code sent to{" "}
                <span className="font-semibold text-gray-700">{emailHint || "your email"}</span>
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Success */}
            {successMsg && (
              <div className="mb-5 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-green-700 text-sm font-medium">{successMsg}</p>
              </div>
            )}

            {/* Remaining attempts warning */}
            {remainingAttempts !== null && remainingAttempts <= 2 && (
              <div className="mb-5 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <p className="text-orange-700 text-sm font-medium text-center">
                  ⚠️ {remainingAttempts} attempt{remainingAttempts !== 1 ? "s" : ""} remaining before lockout
                </p>
              </div>
            )}

            {/* OTP Boxes */}
            <form onSubmit={handleVerify}>
              <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all
                      ${digit
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-900"
                      } focus:border-blue-500 focus:ring-2 focus:ring-blue-100`}
                    style={{ fontSize: "1.5rem" }}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {/* Verify Button */}
              <button
                type="submit"
                disabled={loading || otp.join("").length < 6}
                className={`w-full py-4 rounded-xl text-white font-bold text-base transition-all duration-300 mb-4
                  ${loading || otp.join("").length < 6
                    ? "bg-gray-300 cursor-not-allowed"
                    : "hover:opacity-90 hover:shadow-lg transform hover:scale-[1.01] active:scale-[0.99]"
                  }`}
                style={{
                  background: loading || otp.join("").length < 6
                    ? undefined
                    : "linear-gradient(135deg, #1a1a2e, #0f3460)"
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Verifying...</span>
                  </div>
                ) : "Verify & Login"}
              </button>
            </form>

            {/* Resend OTP */}
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-2">Didn't receive the code?</p>
              <button
                onClick={handleResend}
                disabled={cooldown > 0 || resending}
                className={`text-sm font-semibold transition-colors ${
                  cooldown > 0 || resending
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-blue-600 hover:text-blue-800 underline"
                }`}
              >
                {resending
                  ? "Sending..."
                  : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend OTP"}
              </button>
            </div>

            {/* Back to login */}
            <div className="text-center mt-5 pt-5 border-t border-gray-100">
              <button
                onClick={() => navigate("/", { replace: true })}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 mx-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Login
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2025 ISML Portal · Version 2.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default OtpVerifyPage;
